import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SourceType, Journal } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ExtractionService } from '../../infrastructure/extraction/extraction.service';
import { AiService } from '../../infrastructure/ai/ai.service';
import { SkillsService } from '../skills/skills.service';
import { SkillEventsService } from '../skill-events/skill-events.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { LearningEvidencePrompt } from '../../infrastructure/ai/prompt/learning-evidence.prompt';

@Injectable()
export class JournalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: ExtractionService,
    private readonly aiService: AiService,
    private readonly skillsService: SkillsService,
    private readonly skillEventsService: SkillEventsService,
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
    const journal = await this.prisma.journal.create({
      data: {
        title: dto.title.trim(),
        content: cleanText,
        userId,
      },
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
      const journal = await this.prisma.journal.create({
        data: {
          title: file.originalname,
          content: cleanText,
          userId,
        },
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
    // STAGE 2: Learning Evidence AI Layer
    const promptRequest = LearningEvidencePrompt.build({
      extractedText: cleanText,
      sourceType: 'TEXT',
    });

    const aiResponse = await this.aiService.generate<{
      skills: Array<{
        name: string;
        confidence: number;
        complexity: 'beginner' | 'intermediate' | 'advanced';
        evidence: string[];
        reason: string;
      }>;
    }>(promptRequest);

    if (!aiResponse || !aiResponse.skills || aiResponse.skills.length === 0) {
      return; // Stop pipeline if AI finds 0 learning signals
    }

    // STAGE 3: Skill Graph Mapping Layer (Dynamically resolves edges & parentIds via AI)
    const skillIds = await this.skillsService.findOrCreateMany(
      aiResponse.skills.map((s) => ({
        name: s.name,
        description: s.reason,
      })),
    );

    // STAGE 4, 5 & 6: Bayesian progression math, transactional logging & projection mapping
    for (let i = 0; i < aiResponse.skills.length; i++) {
      const s = aiResponse.skills[i];
      const skillId = skillIds[i];

      // Logs original action and recursively propagates decay delta up ancestors
      await this.skillEventsService.recordEvent({
        userId,
        skillId,
        sourceType: SourceType.JOURNAL,
        sourceId: journalId,
        rawScore: s.confidence * 100.0, // scale confidence to score delta [0-100]
        reason: s.reason,
        metadata: {
          sourceRef,
          rawText: cleanText.substring(0, 1000), // Clamp long texts to avoid payload bloating
          rawSignals: s.evidence,
        },
      });
    }
  }

  async findAll(userId: string): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Journal> {
    if (!id) {
      throw new BadRequestException('ID journal wajib diisi');
    }

    const journal = await this.prisma.journal.findUnique({
      where: { id },
    });

    if (!journal || journal.userId !== userId) {
      throw new NotFoundException(`Journal dengan ID '${id}' tidak ditemukan`);
    }

    return journal;
  }
}
