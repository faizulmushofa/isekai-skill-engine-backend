import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { ConfigService } from '../../config/config.service';
import { GeminiProvider } from '../providers/gemini.provider';
import { StructuredResponseParser } from '../parser/structured-response-parser';
import { ProviderExecutor } from '../routing/provider-executor';
import { AiTaskRouter } from '../routing/ai-task-router';
import { LearningEvidencePrompt } from '../prompt/learning-evidence.prompt';
import { AssessmentGeneratorPrompt } from '../prompt/assessment-generator.prompt';
import { ProjectEvidencePrompt } from '../prompt/project-evidence.prompt';
import { BehavioralCareerAlignmentPrompt } from '../prompt/behavioral-career-alignment.prompt';
import { AiTaskType } from '../enums/ai-task-type.enum';

describe('AiService (Arsitektur Revisi Tangguh - Gemini Only)', () => {
  let service: AiService;
  let configService: ConfigService;
  let mockGeminiProvider: jest.Mocked<GeminiProvider>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        StructuredResponseParser,
        ProviderExecutor,
        AiTaskRouter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'GEMINI_API_KEY') return 'test-gemini-key';
              if (key === 'GEMINI_API_KEY_BACKUP') return 'backup-gemini-key';
              return undefined;
            }),
          },
        },
        { provide: GeminiProvider, useValue: mockGeminiProvider },
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
      mockGeminiProvider.generate.mockResolvedValueOnce(
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
      mockGeminiProvider.generate.mockResolvedValueOnce(
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
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'GEMINI_API_KEY') return undefined; // Primary undefined
        if (key === 'GEMINI_API_KEY_BACKUP') return 'backup-active-key';
        return undefined;
      });

      const request = LearningEvidencePrompt.build({
        extractedText: 'Testing key rotation',
        sourceType: 'TEXT',
      });

      // Triggers fallback route which has apiKeysEnv: ['GEMINI_API_KEY_BACKUP', 'GEMINI_API_KEY']
      mockGeminiProvider.generate
        .mockRejectedValueOnce(new Error('First key fail')) // Primary fail
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
      // Primary gemini-2.5-flash fails (tried twice because maxRetries is 2)
      mockGeminiProvider.generate
        .mockRejectedValueOnce(new Error('Flash model rate limited - attempt 1'))
        .mockRejectedValueOnce(new Error('Flash model rate limited - attempt 2'));

      // Fallback model gemini-1.5-flash succeeds
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
        expect.objectContaining({ model: 'gemini-1.5-flash' }),
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
      expect(request.systemPrompt).toContain('World-Class Assessment Generator');
      expect(request.userPrompt).toContain('Target Skill: NestJS');
      
      // Technical parameters should be completely absent from prompt template response!
      expect((request as any).model).toBeUndefined();
      expect((request as any).apiKeyEnvVar).toBeUndefined();
      expect((request as any).responseSchema).toBeUndefined();
      expect((request as any).apiKeysEnv).toBeUndefined();
    });
  });
});
