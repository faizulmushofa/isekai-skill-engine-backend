import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { ConfigService } from '../../config/config.service';
import { GeminiProvider } from '../providers/gemini.provider';
import { GroqProvider } from '../providers/groq.provider';
import { PromptGuardService } from '../guard/prompt-guard.service';
import { StructuredResponseParser } from '../parser/structured-response-parser';
import { ProviderExecutor } from '../routing/provider-executor';
import { AiTaskRouter } from '../routing/ai-task-router';
import { LearningEvidencePrompt } from '../prompt/learning-evidence.prompt';
import { AssessmentGeneratorPrompt } from '../prompt/assessment-generator.prompt';
import { ProjectEvidencePrompt } from '../prompt/project-evidence.prompt';
import { BehavioralCareerAlignmentPrompt } from '../prompt/behavioral-career-alignment.prompt';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenTrackerService } from '../../token-management/token-tracker.service';
import { DynamicRoutingService } from '../routing/dynamic-routing.service';

describe('AiService (Arsitektur Revisi Tangguh - Gemini Only)', () => {
  let service: AiService;
  let configService: ConfigService;
  let mockGeminiProvider: jest.Mocked<GeminiProvider>;
  let mockGroqProvider: jest.Mocked<GroqProvider>;
  let mockPromptGuardService: jest.Mocked<PromptGuardService>;

  beforeEach(async () => {
    mockGeminiProvider = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          skills: [
            {
              name: 'NestJS',
              confidence: 0.91,
              complexity: 'intermediate',
              evidence: ['DI'],
              reason: 'Good explanation',
            },
          ],
        }),
      ),
    } as unknown as jest.Mocked<GeminiProvider>;

    mockGroqProvider = {
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          skills: [
            {
              name: 'NestJS',
              confidence: 0.91,
              complexity: 'intermediate',
              evidence: ['DI'],
              reason: 'Good explanation',
            },
          ],
        }),
      ),
    } as unknown as jest.Mocked<GroqProvider>;

    mockPromptGuardService = {
      classify: jest.fn().mockResolvedValue({ isSafe: true, rawResponse: 'benign' }),
      enforceOrThrow: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PromptGuardService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        StructuredResponseParser,
        ProviderExecutor,
        AiTaskRouter,
        {
          provide: DynamicRoutingService,
          useValue: {
            getRoutingConfig: jest.fn().mockReturnValue(null),
            getRoute: jest.fn().mockReturnValue({ provider: 'gemini', model: 'test', apiKeysEnv: ['TEST_KEY'], temperature: 0.1 }),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: jest.fn().mockResolvedValue(null) },
            aiUserBlock: { findFirst: jest.fn().mockResolvedValue(null) },
          },
        },
        {
          provide: TokenTrackerService,
          useValue: {
            trackUsage: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
              if (key === 'GEMINI_API_KEY_BACKUP') return 'backup-gemini-key';
              if (key === 'GROQ_API_KEY') return 'test-groq-key';
              return undefined;
            }),
          },
        },
        { provide: GeminiProvider, useValue: mockGeminiProvider },
        { provide: GroqProvider, useValue: mockGroqProvider },
        { provide: PromptGuardService, useValue: mockPromptGuardService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('JSON Extraction & Zod Schema Validation', () => {
    it('should successfully parse and validate a valid JSON response text', async () => {
      const request = LearningEvidencePrompt.build({
        extractedText: 'User explained NestJS features',
        sourceType: 'TEXT',
      });

      const response = await service.generate<any>(request);

      expect(response.skills).toBeDefined();
      expect(response.skills[0].name).toBe('NestJS');
      expect(response.skills[0].complexity).toBe('intermediate');
    });

    it('should strip markdown formatting and validate correctly', async () => {
      mockGroqProvider.generate.mockResolvedValueOnce(
        '```json\n{\n  "skills": [\n    {\n      "name": "TypeScript",\n      "confidence": 0.88,\n      "complexity": "beginner",\n      "evidence": ["interfaces"],\n      "reason": "OK"\n    }\n  ]\n}\n```',
      );

      const request = LearningEvidencePrompt.build({
        extractedText: 'Coding in TS',
        sourceType: 'TEXT',
      });

      const response = await service.generate<any>(request);
      expect(response.skills[0].name).toBe('TypeScript');
    });

    it('should throw an error if the response format does not match the schema', async () => {
      // Missing required property "evidence" and wrong complexity enum
      mockGroqProvider.generate.mockResolvedValueOnce(
        JSON.stringify({
          skills: [
            {
              name: 'HTML',
              confidence: 0.9,
              complexity: 'expert', // Invalid complexity
              reason: 'Missing evidence too',
            },
          ],
        }),
      );

      const request = LearningEvidencePrompt.build({
        extractedText: 'Coding in HTML',
        sourceType: 'TEXT',
      });

      await expect(service.generate<any>(request)).rejects.toThrow(
        /AI Response JSON schema validation failed/,
      );
    });
  });

  describe('Key Rotation (apiKeysEnv support)', () => {
    it('should try backup API keys if the primary key is not defined', async () => {
      // Primary GROQ is undefined, forcing failover to Gemini fallback.
      // For Gemini fallback, GEMINI_API_KEY is undefined, forcing rotation to GEMINI_API_KEY_BACKUP.
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GROQ_API_KEY') return undefined;
        if (key === 'GEMINI_API_KEY') return undefined;
        if (key === 'GEMINI_API_KEY_BACKUP') return 'backup-active-key';
        return undefined;
      });

      mockGeminiProvider.generate.mockReset();
      mockGeminiProvider.generate
        .mockRejectedValueOnce(new Error('First key fail'))
        .mockResolvedValueOnce(
          JSON.stringify({
            skills: [
              {
                name: 'KeyRotation',
                confidence: 0.99,
                complexity: 'advanced',
                evidence: ['keys'],
                reason: 'Success',
              },
            ],
          }),
        );

      const request = LearningEvidencePrompt.build({
        extractedText: 'Testing key rotation',
        sourceType: 'TEXT',
      });

      const response = await service.generate<any>(request);
      expect(response.skills[0].name).toBe('KeyRotation');
      
      // Verified backup key was passed directly
      expect(mockGeminiProvider.generate).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ apiKey: 'backup-active-key' }),
      );
    });
  });

  describe('Provider Fallback & Failover Policies', () => {
    it('should failover to the configured fallback route if the primary fails completely', async () => {
      mockGroqProvider.generate.mockReset();
      mockGeminiProvider.generate.mockReset();

      // Primary groq fails (tried twice because maxRetries is 2)
      mockGroqProvider.generate
        .mockRejectedValueOnce(new Error('Groq model rate limited - attempt 1'))
        .mockRejectedValueOnce(new Error('Groq model rate limited - attempt 2'));

      // Fallback model gemini-2.5-flash succeeds
      mockGeminiProvider.generate.mockResolvedValueOnce(
        JSON.stringify({
          skills: [
            {
              name: 'FallbackModel',
              confidence: 0.95,
              complexity: 'intermediate',
              evidence: ['rate limits'],
              reason: 'Resolved via fallback',
            },
          ],
        }),
      );

      const request = LearningEvidencePrompt.build({
        extractedText: 'Rate limits hit',
        sourceType: 'TEXT',
      });

      const response = await service.generate<any>(request);
      expect(response.skills[0].name).toBe('FallbackModel');
      
      expect(mockGeminiProvider.generate).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ model: 'gemini-2.5-flash' }),
      );
    });
  });

  describe('Strict Prompt Template Decoupling', () => {
    it('should build templates with only semantic text and no routing/technical keys', () => {
      const request = AssessmentGeneratorPrompt.build({
        skill: 'NestJS',
        difficulty: 'intermediate',
      });

      expect(request.taskType).toBe(AiTaskType.ASSESSMENT_GENERATOR);
      expect(request.systemPrompt).toContain('Anda adalah Pembuat Soal ISEKAI SKILL ENGINE.');
      expect(request.userPrompt).toContain('Target Skill: NestJS');
      
      // Technical parameters should be completely absent from prompt template response!
      expect((request as any).model).toBeUndefined();
      expect((request as any).apiKeyEnvVar).toBeUndefined();
      expect((request as any).responseSchema).toBeUndefined();
      expect((request as any).apiKeysEnv).toBeUndefined();
    });
  });
});
