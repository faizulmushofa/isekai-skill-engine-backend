import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
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
import { AiTaskType } from '../../infrastructure/ai/enums/ai-task-type.enum';
import { InMemoryQueueService } from '../../infrastructure/queue/in-memory-queue.service';
import { DeterministicExtractionService } from '../../infrastructure/extraction/deterministic-extraction.service';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly extractionService: ExtractionService,
    private readonly aiService: AiService,
    private readonly skillsService: SkillsService,
    private readonly skillEventsService: SkillEventsService,
    private readonly gitProcessingService: GitProcessingService,
    private readonly queueService: InMemoryQueueService,
    private readonly deterministicService: DeterministicExtractionService,
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
   * Orchestrates project skills by queuing the job and returning immediately (202 Accepted).
   */
  async orchestrateProjectSkills(
    userId: string,
    projectId: string,
    dto: OrchestrateProjectDto,
    file?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<any> {
    const project = await this.findOne(userId, projectId);
    const repositoryUrl = dto.repositoryUrl || project.repositoryUrl;
    
    // Check Extraction Cache to bypass everything if already processed
    if (repositoryUrl && dto.commitHash) {
      const cached = await this.prisma.extractionCache.findUnique({
        where: {
          userId_repoUrl_commitHash: {
            userId,
            repoUrl: repositoryUrl,
            commitHash: dto.commitHash,
          }
        }
      });

      if (cached) {
        this.logger.log(`[Project Extraction] Returning cached result for ${repositoryUrl} @ ${dto.commitHash}`);
        return {
          status: 'Cached',
          message: 'Extracted from cache',
          skills: cached.extractedSkills,
        };
      }
    }

    const jobId = `extract-${projectId}-${Date.now()}`;
    
    // Add to Queue
    await this.queueService.addJob(jobId, async () => {
      await this.processProjectSkills(
        userId, 
        project, 
        dto, 
        file ? file.buffer : undefined,
        file ? file.originalname : undefined,
        file ? file.mimetype : undefined
      );
    });

    return {
      status: 'Accepted',
      jobId,
      message: 'Extraction added to queue. Please poll for completion or check graph later.',
    };
  }

  /**
   * The actual background worker logic for project extraction.
   */
  private async processProjectSkills(
    userId: string,
    project: Project,
    dto: OrchestrateProjectDto,
    fileBuffer?: Buffer,
    fileName?: string,
    fileMime?: string
  ): Promise<void> {
    const projectId = project.id;
    let mode: 'INIT' | 'COMMIT' = 'INIT';
    if (dto.modeHint) {
      mode = dto.modeHint;
    } else {
      const previousAnalysisExists = dto.previousAnalysisExists ?? false;
      mode = previousAnalysisExists ? 'COMMIT' : 'INIT';
    }
    this.logger.log(`[Project Extraction Background] Starting orchestration for project ${projectId} in ${mode} mode`);

    const repositoryUrl = dto.repositoryUrl || project.repositoryUrl;
    let gitPayload: any = null;

    if (repositoryUrl && repositoryUrl.trim()) {
      if (mode === 'INIT') {
        this.logger.log(`[Project Extraction Background] Initializing repository scan: ${repositoryUrl.trim()}`);
        gitPayload = await this.gitProcessingService.initializeRepository(
          projectId,
          repositoryUrl.trim(),
        );
      } else {
        this.logger.log(`[Project Extraction Background] Processing webhook commit: ${dto.commitHash}`);
        gitPayload = await this.gitProcessingService.processWebhookCommit(
          projectId,
          dto.commitHash,
        );
      }
      this.logger.log(`[Project Extraction Background] Git payload extracted successfully`);
    }

    let cleanText = project.reportContent || '';
    if (fileBuffer && fileName && fileMime) {
      const tempDir = os.tmpdir();
      const tempFilePath = path.join(tempDir, `proj-upload-${Date.now()}-${fileName}`);
      await fs.promises.writeFile(tempFilePath, fileBuffer);

      try {
        const extracted = await this.extractionService.extractContent(tempFilePath, fileMime);
        cleanText = extracted.normalizedText || extracted.rawText || '';
        this.logger.log(`[Project Extraction Background] Content successfully extracted from file upload`);

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

    const language = gitPayload?.repoIntelligence?.primaryLanguage || 'TypeScript';
    const modules = gitPayload?.signalData?.fileStructure || [];
    const dependencies = gitPayload?.signalData?.dependencies || [];
    
    // Deterministic Extraction Logic
    const deterministicResult = await this.deterministicService.extract(modules, dependencies);
    const ruleSignals = [...(gitPayload?.signalData?.ruleSignals || []), ...deterministicResult.signals];

    const repoIntelligenceBlock = gitPayload
      ? [
          'AUTOMATED REPOSITORY INTELLIGENCE:',
          `- Primary Language: ${language}`,
          `- Mapped Dependencies: ${dependencies.join(', ')}`,
          `- File Structure Indicators: ${Array.isArray(modules) ? modules.join(', ') : JSON.stringify(modules)}`,
          `- Rules Signals Extracted: ${ruleSignals.join(', ')}`,
          `- Deterministic Languages Detected: ${Array.from(deterministicResult.languages).join(', ')}`,
          `- Deterministic Skills Detected: ${Array.from(deterministicResult.skills).join(', ')}`,
        ].join('\n')
      : '';

    const commitDeltaBlock = mode === 'COMMIT' && gitPayload?.commitContext
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
    ].filter(Boolean).join('\n\n');

    // Fetch user's active career goal skills to pass as valid parent IDs
    const activeGoals = await this.prisma.userGoal.findMany({
      where: { userId },
      include: {
        careerGoal: {
          include: {
            careerGoalSkills: {
              include: { skill: true }
            }
          }
        }
      }
    });

    const validParentSkills: Array<{id: string; name: string}> = [];
    if (activeGoals.length > 0) {
      activeGoals.forEach(ug => {
        ug.careerGoal.careerGoalSkills.forEach(cgs => {
          validParentSkills.push({ id: cgs.skill.id, name: cgs.skill.name });
        });
      });
    }

    this.logger.log(`[Project Extraction Background] Triggering AI ingestion mapping with ${validParentSkills.length} valid parent skills constraints.`);
    const prompt = ProjectEvidencePrompt.build({
      title: project.title,
      description: compiledDescription,
      technologies: dependencies.length > 0 ? dependencies : undefined,
      repoUrl: repositoryUrl || undefined,
      validParentSkills,
    });

    this.logger.debug(`[Project Extraction Background] AI Prompt Payload:\n${JSON.stringify(prompt, null, 2)}`);

    const aiResult = await this.aiService.generate<{
      skills: Array<{
        name: string;
        parentId: string | null;
        confidence: number;
        complexity: 'beginner' | 'intermediate' | 'advanced';
        evidence: string[];
        reason: string;
      }>;
    }>({
      taskType: AiTaskType.PROJECT_EVIDENCE,
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      userId,
    });

    this.logger.debug(`[Project Extraction Background] AI Generation Result:\n${JSON.stringify(aiResult, null, 2)}`);

    const generatedEvents: any[] = [];
    if (aiResult && aiResult.skills && aiResult.skills.length > 0) {
      for (const skill of aiResult.skills) {
        // REJECT policy: If the AI failed to map to a valid parent skill, reject it
        if (!skill.parentId) {
          this.logger.warn(`[Project Extraction Background] REJECTED SKILL: "${skill.name}" (Reason: Tidak ada kaitannya dengan Career Goal User, parentId = null)`);
          continue; // Drop the skill entirely
        }

        const skillIds = await this.skillsService.findOrCreateMany([
          {
            name: skill.name.trim(),
            description: skill.reason || `Extracted from project "${project.title}"`,
            parentId: skill.parentId,
          },
        ]);
        const skillId = skillIds[0];

        let confidence = skill.confidence;
        if (mode === 'COMMIT') {
          confidence = Math.max(0.05, Math.min(0.4, confidence));
        } else {
          confidence = Math.max(0.1, Math.min(1.0, confidence));
        }
        const rawScore = confidence * 100.0;

        const dbEvent = await this.skillEventsService.recordEvent({
          userId,
          skillId,
          sourceType: SourceType.PROJECT,
          sourceId: projectId,
          rawScore,
          reason: skill.reason,
          metadata: {
            signals: skill.evidence,
            subSkills: [{ name: skill.name, weight: confidence }],
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

    // Cache the result
    if (repositoryUrl && dto.commitHash) {
       await this.prisma.extractionCache.upsert({
         where: {
           userId_repoUrl_commitHash: {
             userId,
             repoUrl: repositoryUrl,
             commitHash: dto.commitHash,
           }
         },
         create: {
           userId,
           repoUrl: repositoryUrl,
           commitHash: dto.commitHash,
           extractedSkills: generatedEvents,
         },
         update: {
           extractedSkills: generatedEvents,
         }
       });
    }

    this.logger.log(`[Project Extraction Background] Orchestration completed. Extracted ${generatedEvents.length} skill events.`);
  }
}
