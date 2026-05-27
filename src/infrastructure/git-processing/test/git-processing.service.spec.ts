import { Test, TestingModule } from '@nestjs/testing';
import { GitProcessingService } from '../git-processing.service';
import { GitCoreService } from '../services/git-core.service';
import { ContextExtractorService } from '../services/context-extractor.service';
import { IntelligenceDetectorService } from '../services/intelligence-detector.service';
import { RuleEngineService } from '../services/rule-engine.service';
import { SignalComputationService } from '../services/signal-computation.service';
import * as fs from 'fs';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(),
    promises: {
      writeFile: jest.fn(),
      readFile: jest.fn(),
    },
  };
});

describe('GitProcessingService', () => {
  let service: GitProcessingService;
  let mockGitCore: Partial<GitCoreService>;
  let mockContextExtractor: Partial<ContextExtractorService>;
  let mockIntelligenceDetector: Partial<IntelligenceDetectorService>;
  let mockRuleEngine: Partial<RuleEngineService>;
  let mockSignalComputation: Partial<SignalComputationService>;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReset();
    (fs.promises.writeFile as jest.Mock).mockReset();
    (fs.promises.readFile as jest.Mock).mockReset();

    mockGitCore = {
      getRepoPath: jest.fn().mockReturnValue('/mock/repo/path'),
      clone: jest.fn().mockResolvedValue('/mock/repo/path'),
      fetch: jest.fn().mockResolvedValue(undefined),
      getLatestCommitHash: jest.fn().mockResolvedValue('new-commit-hash-abc'),
      getFilesChanged: jest.fn().mockResolvedValue(['src/auth/auth.service.ts']),
      getDiffSummary: jest.fn().mockResolvedValue({ additions: 15, deletions: 2 }),
      getRawDiff: jest.fn().mockResolvedValue('+ new auth logic'),
    };

    mockContextExtractor = {
      extractContext: jest.fn().mockResolvedValue({
        readmeContent: '# Hello',
        manifests: {},
        fileTree: ['package.json'],
        dependencies: ['lodash'],
        entryPoints: [],
      }),
    };

    mockIntelligenceDetector = {
      detectIntelligence: jest.fn().mockReturnValue({
        language: ['JS/TS'],
        framework: ['NestJS'],
        database: [],
        architecture: { type: 'Standard Layered', confidence: 0.5, reason: '' },
      }),
    };

    mockRuleEngine = {
      extractSignals: jest.fn().mockReturnValue([
        {
          skill: 'Authentication Skill',
          confidence: 0.85,
          reason: 'Detected auth file',
          filePath: 'src/auth/auth.service.ts',
          matchType: 'path',
        },
      ]),
    };

    mockSignalComputation = {
      computeSignals: jest.fn().mockReturnValue([
        {
          skill: 'Authentication Skill',
          confidence: 0.85,
          reason: 'Skill Authentication detected...',
          strength: 1,
          coverage: 1,
          intensity: 1,
          reasons: ['Detected auth file'],
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GitProcessingService,
        { provide: GitCoreService, useValue: mockGitCore },
        { provide: ContextExtractorService, useValue: mockContextExtractor },
        { provide: IntelligenceDetectorService, useValue: mockIntelligenceDetector },
        { provide: RuleEngineService, useValue: mockRuleEngine },
        { provide: SignalComputationService, useValue: mockSignalComputation },
      ],
    }).compile();

    service = module.get<GitProcessingService>(GitProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeRepository', () => {
    it('should clone, extract context, detect intelligence, write index, and return AIInputPayload', async () => {
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const payload = await service.initializeRepository('repo-123', 'https://github.com/my/repo.git');

      expect(mockGitCore.clone).toHaveBeenCalledWith('https://github.com/my/repo.git', 'repo-123');
      expect(mockGitCore.getLatestCommitHash).toHaveBeenCalledWith('repo-123');
      expect(mockContextExtractor.extractContext).toHaveBeenCalledWith('repo-123');
      expect(mockIntelligenceDetector.detectIntelligence).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();

      expect(payload.initContext).toBeDefined();
      expect(payload.initContext?.repoId).toBe('repo-123');
      expect(payload.signalData.ruleSignals).toEqual([]);
    });
  });

  describe('processWebhookCommit', () => {
    it('should fetch, extract flat signals, compute aggregated signals, update index, and return AIInputPayload', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.promises.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify({
          repoId: 'repo-123',
          repoUrl: 'https://github.com/my/repo.git',
          lastCommitHash: 'old-commit-hash-123',
          status: 'READY',
          updatedAt: '2026-05-27T00:00:00Z',
        }),
      );
      (fs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const payload = await service.processWebhookCommit('repo-123', 'new-commit-hash-abc');

      expect(mockGitCore.fetch).toHaveBeenCalledWith('repo-123');
      expect(mockRuleEngine.extractSignals).toHaveBeenCalledWith(['src/auth/auth.service.ts'], '+ new auth logic');
      expect(mockSignalComputation.computeSignals).toHaveBeenCalled();
      expect(fs.promises.writeFile).toHaveBeenCalled();

      expect(payload.commitContext).toBeDefined();
      expect(payload.commitContext?.commitHash).toBe('new-commit-hash-abc');
      expect(payload.signalData.ruleSignals[0].skill).toBe('Authentication Skill');
      expect(payload.signalData.ruleSignals[0].strength).toBe(1);
    });
  });
});
