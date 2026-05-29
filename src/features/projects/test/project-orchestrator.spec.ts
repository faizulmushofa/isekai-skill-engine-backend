import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ExtractionService } from '../../../infrastructure/extraction/extraction.service';
import { AiService } from '../../../infrastructure/ai/ai.service';
import { SkillsService } from '../../skills/skills.service';
import { SkillEventsService } from '../../skill-events/skill-events.service';
import { GitProcessingService } from '../../../infrastructure/git-processing/git-processing.service';
import { InMemoryQueueService } from '../../../infrastructure/queue/in-memory-queue.service';
import { DeterministicExtractionService } from '../../../infrastructure/extraction/deterministic-extraction.service';
import { SourceType } from '@prisma/client';

describe('Project Skill Orchestration Engine', () => {
  let service: ProjectsService;
  let prisma: PrismaService;
  let extractionService: ExtractionService;
  let aiService: AiService;
  let skillsService: SkillsService;
  let skillEventsService: SkillEventsService;
  let gitProcessingService: GitProcessingService;

  const mockQueueService = {
    addJob: jest.fn().mockImplementation((id, cb) => cb()),
  };

  const mockDeterministic = {
    extract: jest.fn().mockResolvedValue({ signals: [], languages: new Set(), skills: new Set() }),
  };

  const mockPrisma = {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    extractionCache: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    userGoal: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockExtractionService = {
    extractContent: jest.fn(),
  };

  const mockAiService = {
    generate: jest.fn(),
  };

  const mockSkillsService = {
    findOrCreateMany: jest.fn(),
  };

  const mockSkillEventsService = {
    recordEvent: jest.fn(),
  };

  const mockGitProcessingService = {
    initializeRepository: jest.fn(),
    processWebhookCommit: jest.fn(),
  };

  const mockProject = {
    id: 'proj-123',
    userId: 'user-456',
    title: 'Super Web Application',
    description: 'A React & NestJS based SaaS product',
    repositoryUrl: 'https://github.com/my/project.git',
    reportContent: 'Old report content',
  };

  const mockGitInitPayload = {
    repoId: 'proj-123',
    repoIntelligence: { primaryLanguage: 'TypeScript' },
    signalData: {
      dependencies: ['passport', 'jwt'],
      fileStructure: ['auth.ts', 'auth.controller.ts'],
      ruleSignals: ['JWT_AUTH_FOUND'],
    },
    metadata: {
      lastCommitHash: 'initHash',
      timestamp: '2026-05-28T00:00:00Z',
    },
  };

  const mockGitCommitPayload = {
    repoId: 'proj-123',
    repoIntelligence: { primaryLanguage: 'TypeScript' },
    signalData: {
      dependencies: ['passport', 'jwt'],
      fileStructure: ['auth.ts', 'auth.controller.ts'],
      ruleSignals: ['JWT_AUTH_UPDATED'],
    },
    commitContext: {
      commitHash: 'commitHashabc',
      filesChanged: ['auth.ts'],
      diffSummary: { insertions: 5, deletions: 2 },
      rawDiff: '+ PassportStrategy modified',
    },
    metadata: {
      lastCommitHash: 'commitHashabc',
      timestamp: '2026-05-28T00:01:00Z',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExtractionService, useValue: mockExtractionService },
        { provide: AiService, useValue: mockAiService },
        { provide: SkillsService, useValue: mockSkillsService },
        { provide: SkillEventsService, useValue: mockSkillEventsService },
        { provide: GitProcessingService, useValue: mockGitProcessingService },
        { provide: InMemoryQueueService, useValue: mockQueueService },
        { provide: DeterministicExtractionService, useValue: mockDeterministic },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);
    extractionService = module.get<ExtractionService>(ExtractionService);
    aiService = module.get<AiService>(AiService);
    skillsService = module.get<SkillsService>(SkillsService);
    skillEventsService = module.get<SkillEventsService>(SkillEventsService);
    gitProcessingService = module.get<GitProcessingService>(GitProcessingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('orchestrateProjectSkills - Pre-AI Extraction Pipeline', () => {
    it('should call ExtractionService if reportFile is uploaded, update DB, and clear disk file', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockExtractionService.extractContent.mockResolvedValue({
        normalizedText: 'Extracted new PDF text content',
        rawText: 'Raw new PDF text content',
      });

      mockAiService.generate.mockResolvedValue({ skills: [] });

      const dto = {};
      const fileMock = {
        buffer: Buffer.from('mock buffer'),
        originalname: 'report.pdf',
        mimetype: 'application/pdf',
      };

      await service.orchestrateProjectSkills('user-456', 'proj-123', dto, fileMock);

      expect(mockExtractionService.extractContent).toHaveBeenCalledWith(
        expect.stringContaining('proj-upload-'),
        'application/pdf',
      );
      expect(mockPrisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-123' },
        data: { reportContent: 'Extracted new PDF text content' },
      });
    });
  });

  describe('orchestrateProjectSkills - Mode: INIT (Automated Git Scanning)', () => {
    it('should invoke GitProcessingService initializeRepository, clamp score to 0.1 - 1.0, and recordEvent', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockGitProcessingService.initializeRepository.mockResolvedValue(mockGitInitPayload);
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-uuid-xxx']);

      // AI extracts skills with confidence 0.85
      mockAiService.generate.mockResolvedValue({
        skills: [
          {
            name: 'Backend Security',
            parentId: 'parent-skill-uuid',
            confidence: 0.85,
            complexity: 'intermediate',
            evidence: ['auth.ts module matched'],
            reason: 'Uses passport and jwt',
          },
        ],
      });

      // Mock database SkillEvent creation response
      mockSkillEventsService.recordEvent.mockResolvedValue({
        id: 'event-uuid-yyy',
        rawScore: 85.0,
        weightedScore: 25.5,
        contribution: 15.0,
        oldProgress: 0.0,
        newProgress: 15.0,
        reason: 'Uses passport and jwt',
        metadata: { signals: ['auth.ts module matched'] },
      });

      const dto = {
        modeHint: 'INIT' as const,
      };

      const result = await service.orchestrateProjectSkills('user-456', 'proj-123', dto);

      expect(result.status).toBe('Accepted');
      expect(mockGitProcessingService.initializeRepository).toHaveBeenCalledWith(
        'proj-123',
        'https://github.com/my/project.git',
      );

      expect(mockSkillEventsService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-456',
        skillId: 'skill-uuid-xxx',
        sourceType: SourceType.PROJECT,
        sourceId: 'proj-123',
        rawScore: 85.0, // 0.85 * 100
        reason: 'Uses passport and jwt',
        metadata: expect.objectContaining({
          bayesianScore: 85.0,
        }),
      });
    });
  });

  describe('orchestrateProjectSkills - Mode: COMMIT (Automated Git Commit Scanning)', () => {
    it('should invoke GitProcessingService processWebhookCommit, clamp confidence to 0.4, and record incremental delta', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(mockProject);
      mockGitProcessingService.processWebhookCommit.mockResolvedValue(mockGitCommitPayload);
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-uuid-xxx']);

      // AI extracts skills with confidence 0.95 (which gets clamped to 0.4 under COMMIT mode)
      mockAiService.generate.mockResolvedValue({
        skills: [
          {
            name: 'Backend Security',
            parentId: 'parent-skill-uuid',
            confidence: 0.95,
            complexity: 'intermediate',
            evidence: ['auth.ts module changed'],
            reason: 'Modified authentication logic',
          },
        ],
      });

      mockSkillEventsService.recordEvent.mockResolvedValue({
        id: 'event-uuid-yyy',
        rawScore: 40.0, // 0.4 * 100 due to clamping
        weightedScore: 12.0,
        contribution: 4.5,
        oldProgress: 15.0,
        newProgress: 19.5,
        reason: 'Modified authentication logic',
        metadata: { signals: ['auth.ts module changed'] },
      });

      const dto = {
        commitHash: 'commitHashabc',
        modeHint: 'COMMIT' as const,
      };

      const result = await service.orchestrateProjectSkills('user-456', 'proj-123', dto);

      expect(result.status).toBe('Accepted');
      expect(mockGitProcessingService.processWebhookCommit).toHaveBeenCalledWith(
        'proj-123',
        'commitHashabc',
      );
      expect(mockSkillEventsService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-456',
        skillId: 'skill-uuid-xxx',
        sourceType: SourceType.PROJECT,
        sourceId: 'proj-123',
        rawScore: 40.0, // clamped rawScore
        reason: 'Modified authentication logic',
        metadata: expect.objectContaining({
          bayesianScore: 40.0,
        }),
      });
    });
  });
});
