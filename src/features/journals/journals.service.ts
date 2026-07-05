import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SourceType, Journal } from '@prisma/client';
import { JournalsRepository } from './journals.repository';
import { ExtractionService } from '../../infrastructure/extraction/extraction.service';
import { AiService } from '../../infrastructure/ai/ai.service';
import { SkillEventsService } from '../skill-events/skill-events.service';
import { SkillsService } from '../skills/skills.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { LearningEvidencePrompt } from '../../infrastructure/ai/prompt/learning-evidence.prompt';

@Injectable()
export class JournalsService {
  constructor(
    private readonly journalsRepository: JournalsRepository,
    private readonly extractionService: ExtractionService,
    private readonly aiService: AiService,
    private readonly skillEventsService: SkillEventsService,
    private readonly skillsService: SkillsService,
  ) {}

  /**
   * Manual Journal Ingestion (Stage 1 Normalization + Trigger Pipeline)
   */
  async create(userId: string, dto: CreateJournalDto): Promise<Journal> {
    if (!dto || !dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title tidak boleh kosong');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Content tidak boleh kosong');
    }

    const cleanText = dto.content.trim();

    // 1. Persist the manual Journal record
    const journal = await this.journalsRepository.create({
      title: dto.title.trim(),
      content: cleanText,
      user: { connect: { id: userId } },
    });

    // 2. Trigger the unified progression pipeline
    await this.processJournalPipeline(userId, journal.id, cleanText, 'manual');

    return journal;
  }

  /**
   * File Ingestion Journal (Stage 1 Ingest + In-disk Normalization + Trigger Pipeline)
   */
  async createFromFile(
    userId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<Journal> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File upload tidak boleh kosong.');
    }

    // A. Ingest to local disk temporarily for extraction parsing
    const tempDir = os.tmpdir();
    const tempFilePath = path.join(
      tempDir,
      `upload-${Date.now()}-${file.originalname}`,
    );

    await fs.promises.writeFile(tempFilePath, file.buffer);

    try {
      // B. Trigger Normalization Layer (Extraction Service)
      const extracted = await this.extractionService.extractContent(
        tempFilePath,
        file.mimetype,
      );

      const cleanText = extracted.normalizedText || extracted.rawText;

      if (!cleanText || !cleanText.trim()) {
        throw new BadRequestException(
          'Tidak dapat mengekstrak konten teks yang bermakna dari dokumen.',
        );
      }

      // C. Save the parsed Journal in DB
      const journal = await this.journalsRepository.create({
        title: file.originalname,
        content: cleanText,
        user: { connect: { id: userId } },
      });

      // D. Trigger the unified progression pipeline
      await this.processJournalPipeline(userId, journal.id, cleanText, 'file');

      return journal;
    } finally {
      // E. Guarantee cleanup of temporary uploaded documents
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    }
  }

  /**
   * Orchestrates Stage 2 to 6 of the Ingestion Pipeline.
   * Atomic, transactional, and fully replayable.
   */
  private async processJournalPipeline(
    userId: string,
    journalId: string,
    cleanText: string,
    sourceRef: 'manual' | 'file',
  ): Promise<void> {
    const activeGoals = await this.journalsRepository.findActiveUserGoals(userId);
    const validParentSkills: Array<{id: string; name: string}> = [];
    if (activeGoals.length > 0) {
      activeGoals.forEach(ug => {
        ug.careerGoal.careerGoalSkills.forEach(cgs => {
          validParentSkills.push({ id: cgs.skill.id, name: cgs.skill.name });
        });
      });
    }

    // STAGE 2: Learning Evidence AI Layer
    const promptRequest = LearningEvidencePrompt.build({
      extractedText: cleanText,
      sourceType: 'TEXT',
      validParentSkills,
    });

    const aiResponse = await this.aiService.generate<{
      skills: Array<{
        name: string;
        parentId: string | null;
        confidence: number;
        complexity: 'beginner' | 'intermediate' | 'advanced';
        evidence: string[];
        reason: string;
      }>;
    }>({ ...promptRequest, userId });

    if (!aiResponse || !aiResponse.skills || aiResponse.skills.length === 0) {
      return; // Stop pipeline if AI finds 0 learning signals
    }

    // STAGE 3, 4, 5 & 6: Direct synchronous call (no fire-and-forget)
    for (const s of aiResponse.skills) {
      try {
        const skillIds = await this.skillsService.findOrCreateMany([
          {
            name: s.name,
            description: s.reason,
            parentId: s.parentId ?? null,
          },
        ]);
        const skillId = skillIds[0];

        await this.skillEventsService.recordEvent({
          userId,
          skillId,
          sourceType: SourceType.JOURNAL,
          sourceId: journalId,
          rawScore: s.confidence * 100.0,
          reason: s.reason,
        });
      } catch (err: any) {
        // Log error per skill but continue processing other skills
        console.error(`Failed to record skill event for "${s.name}":`, err?.message);
      }
    }
  }

  async findAll(userId: string): Promise<Journal[]> {
    return this.journalsRepository.findByUserId(userId);
  }

  async findOne(userId: string, id: string): Promise<any> {
    if (!id) {
      throw new BadRequestException('ID journal wajib diisi');
    }

    const journal = await this.journalsRepository.findById(id);

    if (!journal || journal.userId !== userId) {
      throw new NotFoundException(`Journal dengan ID '${id}' tidak ditemukan`);
    }

    const skillEvents = await this.journalsRepository.findSkillEventsForJournal(id);

    return {
      ...journal,
      skillEvents,
    };
  }

  async delete(userId: string, id: string): Promise<any> {
    await this.findOne(userId, id);
    return this.journalsRepository.deleteJournal(id);
  }
}
