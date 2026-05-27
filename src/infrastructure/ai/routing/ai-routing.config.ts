import { z } from 'zod';
import { AiTaskType } from '../enums/ai-task-type.enum';
import {
  LearningEvidenceSchema,
  AssessmentGeneratorSchema,
  ProjectEvidenceSchema,
  BehavioralCareerAlignmentSchema,
  SkillInitClassificationSchema,
  SkillInitAdaptiveQuestionSchema,
  SkillInitSkillsExplanatorSchema,
} from '../schemas/ai-schemas';

export interface AiFallbackRoute {
  provider: 'gemini' | 'groq';
  model: string;
  apiKeysEnv?: string[];
  temperature?: number;
}

export interface AiTaskRoute {
  provider: 'gemini' | 'groq';
  model: string;
  apiKeysEnv: string[];
  responseSchema: z.ZodType<any>;
  temperature: number;
  fallbacks?: AiFallbackRoute[];
  maxRetries?: number;
}

export const AI_TASK_ROUTES: Record<AiTaskType, AiTaskRoute> = {
  [AiTaskType.LEARNING_EVIDENCE]: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: LearningEvidenceSchema,
    temperature: 0.2,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.ASSESSMENT_GENERATOR]: {
    provider: 'groq',
    model: 'qwen/qwen3-32b',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: AssessmentGeneratorSchema,
    temperature: 0.7,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.PROJECT_EVIDENCE]: {
    provider: 'groq',
    model: 'openai/gpt-oss-20b',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: ProjectEvidenceSchema,
    temperature: 0.2,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'qwen/qwen3-32b',
        apiKeysEnv: ['GROQ_API_KEY'],
      },
    ],
  },
  [AiTaskType.BEHAVIORAL_CAREER_ALIGNMENT]: {
    provider: 'groq',
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: BehavioralCareerAlignmentSchema,
    temperature: 0.5,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.SKILL_INIT_CLASSIFICATION]: {
    provider: 'gemini',
    model: 'gemini-2.5-flash-lite',
    apiKeysEnv: ['GEMINI_API_KEY'],
    responseSchema: SkillInitClassificationSchema,
    temperature: 0.1, // Deterministic — strict classification
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        apiKeysEnv: ['GROQ_API_KEY'],
      },
    ],
  },
  [AiTaskType.SKILL_INIT_ADAPTIVE_QUESTION]: {
    provider: 'groq',
    model: 'llama-3.1-8b-instant',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: SkillInitAdaptiveQuestionSchema,
    temperature: 0.5, // Mid — varied questions but structured output
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.5-flash-lite',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.SKILL_INIT_SKILLS_EXPLANATOR]: {
    provider: 'groq',
    model: 'openai/gpt-oss-120b',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: SkillInitSkillsExplanatorSchema,
    temperature: 0.3,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        apiKeysEnv: ['GROQ_API_KEY'],
      },
    ],
  },
};

