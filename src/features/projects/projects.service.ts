import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Project, SourceType } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { OrchestrateProjectDto } from './dto/orchestrate-project.dto';
import { ExtractionService } from '../../infrastructure/extraction/extraction.service';
import { AiService } from '../../infrastructure/ai/ai.service';
import { SkillsService } from '../skills/skills.service';
import { SkillEventsService } from '../skill-events/skill-events.service';
import { GitProcessingService } from '../../infrastructure/git-processing/git-processing.service';
import { ProjectEvidencePrompt } from '../../infrastructure/ai/prompt/project-evidence.prompt';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: ExtractionService,
    private readonly aiService: AiService,
    private readonly skillsService: SkillsService,
    private readonly skillEventsService: SkillEventsService,
    private readonly gitProcessingService: GitProcessingService,
  ) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    if (!dto || !dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title tidak boleh kosong');
    }

    return this.prisma.project.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        repositoryUrl: dto.repositoryUrl?.trim() || null,
        reportContent: dto.reportContent?.trim() || null,
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('ID project wajib diisi');
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project dengan ID '${id}' tidak ditemukan`);
    }

    return project;
  }

  /**
   * Fully-Automated Backend Project Ingestion & Git Repository Scan Pipeline
   */
  async orchestrateProjectSkills(
    userId: string,
    projectId: string,
    dto: OrchestrateProjectDto,
    file?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<any> {
    const project = await this.findOne(userId, projectId);

    // 1. Determine Mode (INIT vs COMMIT)
    let mode: 'INIT' | 'COMMIT' = 'INIT';
    if (dto.modeHint) {
      mode = dto.modeHint;
    } else {
      const previousAnalysisExists = dto.previousAnalysisExists ?? false;
      mode = previousAnalysisExists ? 'COMMIT' : 'INIT';
    }

    // 2. Automated Git Repository Checkout & Intelligent Extraction Scan
    const repositoryUrl = dto.repositoryUrl || project.repositoryUrl;
    let gitPayload: any = null;

    if (repositoryUrl && repositoryUrl.trim()) {
      if (mode === 'INIT') {
        gitPayload = await this.gitProcessingService.initializeRepository(
          projectId,
          repositoryUrl.trim(),
        );
      } else {
        gitPayload = await this.gitProcessingService.processWebhookCommit(
          projectId,
          dto.commitHash,
        );
      }
    }

    // 3. Pre-AI Extraction Layer for Document File Reports
    let cleanText = project.reportContent || '';

    if (file && file.buffer) {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(
        tempDir,
        `proj-upload-${Date.now()}-${file.originalname}`,
      );

      await fs.promises.writeFile(tempFilePath, file.buffer);

      try {
        const extracted = await this.extractionService.extractContent(
          tempFilePath,
          file.mimetype,
        );
        cleanText = extracted.normalizedText || extracted.rawText || '';

        // Save extracted text to project database
        await this.prisma.project.update({
          where: { id: projectId },
          data: { reportContent: cleanText },
        });
      } finally {
        if (fs.existsSync(tempFilePath)) {
          await fs.promises.unlink(tempFilePath);
        }
      }
    }

    // 4. Compile descriptive profile block for AI
    const language = gitPayload?.repoIntelligence?.primaryLanguage || 'TypeScript';
    const modules = gitPayload?.signalData?.fileStructure || [];
    const dependencies = gitPayload?.signalData?.dependencies || [];
    const ruleSignals = gitPayload?.signalData?.ruleSignals || [];

    const repoIntelligenceBlock = gitPayload
      ? [
          'AUTOMATED REPOSITORY INTELLIGENCE:',
          `- Primary Language: ${language}`,
          `- Mapped Dependencies: ${dependencies.join(', ')}`,
          `- File Structure Indicators: ${Array.isArray(modules) ? modules.join(', ') : JSON.stringify(modules)}`,
          `- Rules Signals Extracted: ${ruleSignals.join(', ')}`,
        ].join('\n')
      : '';

    const commitDeltaBlock =
      mode === 'COMMIT' && gitPayload?.commitContext
        ? [
            'COMMIT UPDATE METADATA (GIT DELTA):',
            `- Commit Hash: ${gitPayload.commitContext.commitHash || 'N/A'}`,
            `- Files Changed: ${(gitPayload.commitContext.filesChanged || []).join(', ')}`,
            `- Diff Summary: ${JSON.stringify(gitPayload.commitContext.diffSummary || {})}`,
            `- Raw Code Diff: ${gitPayload.commitContext.rawDiff || 'N/A'}`,
          ].join('\n')
        : '';

    const compiledDescription = [
      `PROJECT DESCRIPTION:\n${project.description || 'None specified'}`,
      `REPORT DETAILED CONTENT:\n${cleanText || 'None specified'}`,
      repoIntelligenceBlock,
      commitDeltaBlock,
    ]
      .filter(Boolean)
      .join('\n\n');

    // 5. Trigger AI Ingestion mapping using PROJECT_EVIDENCE Prompt
    const prompt = ProjectEvidencePrompt.build({
      title: project.title,
      description: compiledDescription,
      technologies: dependencies.length > 0 ? dependencies : undefined,
      repoUrl: repositoryUrl || undefined,
    });

    const aiResult = await this.aiService.generate<{
      skills: Array<{
        name: string;
        confidence: number;
        complexity: 'beginner' | 'intermediate' | 'advanced';
        evidence: string[];
        reason: string;
      }>;
    }>(prompt);

    const generatedEvents: any[] = [];

    // 6. Taxonomy Mapping & Bayesian Ingestion
    if (aiResult && aiResult.skills && aiResult.skills.length > 0) {
      for (const skill of aiResult.skills) {
        // Semantic taxonomy discovery
        const skillIds = await this.skillsService.findOrCreateMany([
          {
            name: skill.name.trim(),
            description: skill.reason || `Extracted from project "${project.title}"`,
          },
        ]);
        const skillId = skillIds[0];

        // Calibrationscore Clamping
        let confidence = skill.confidence;
        if (mode === 'COMMIT') {
          confidence = Math.max(0.05, Math.min(0.4, confidence));
        } else {
          confidence = Math.max(0.1, Math.min(1.0, confidence));
        }

        const rawScore = confidence * 100.0;

        // recordEvent calculates Bayesian and propagates up parentId automatically
        const dbEvent = await this.skillEventsService.recordEvent({
          userId,
          skillId,
          sourceType: SourceType.PROJECT,
          sourceId: projectId,
          rawScore,
          reason: skill.reason,
          metadata: {
            signals: skill.evidence,
            subSkills: [
              {
                name: skill.name,
                weight: confidence,
              },
            ],
            bayesianScore: rawScore,
          },
        });

        generatedEvents.push({
          skillId,
          sourceId: projectId,
          rawScore: dbEvent.rawScore,
          weightedScore: dbEvent.weightedScore,
          contribution: dbEvent.contribution,
          oldProgress: dbEvent.oldProgress,
          newProgress: dbEvent.newProgress,
          reason: dbEvent.reason,
          metadata: dbEvent.metadata,
        });
      }
    }

    return {
      mode,
      projectId,
      userId,
      sourceType: 'PROJECT',
      skillEvents: generatedEvents,
    };
  }
}
