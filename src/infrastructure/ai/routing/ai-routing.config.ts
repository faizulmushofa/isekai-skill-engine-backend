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
  SkillTaxonomySchema,
  QuizBatchEvaluationSchema,
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
  maxDailyTokens?: number;
  maxMonthlyTokens?: number;
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
        model: 'gemini-1.5-flash',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.ASSESSMENT_GENERATOR]: {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    apiKeysEnv: ['GEMINI_API_KEY'],
    responseSchema: AssessmentGeneratorSchema,
    temperature: 0.7,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
        apiKeysEnv: ['GROQ_API_KEY'],
      },
    ],
  },
  [AiTaskType.PROJECT_EVIDENCE]: {
    provider: 'groq',
    model: 'deepseek-r1-distill-llama-70b',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: ProjectEvidenceSchema,
    temperature: 0.2,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-1.5-flash-8b',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.BEHAVIORAL_CAREER_ALIGNMENT]: {
    provider: 'groq',
    model: 'gemma2-9b-it',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: BehavioralCareerAlignmentSchema,
    temperature: 0.5,
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.0-flash',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.SKILL_INIT_CLASSIFICATION]: {
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    apiKeysEnv: ['GEMINI_API_KEY'],
    responseSchema: SkillInitClassificationSchema,
    temperature: 0.1, // Deterministic — strict classification
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'mixtral-8x7b-32768',
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
        model: 'gemini-1.5-pro',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
  [AiTaskType.SKILL_INIT_SKILLS_EXPLANATOR]: {
    provider: 'gemini',
    model: 'gemini-1.5-flash-8b',
    apiKeysEnv: ['GEMINI_API_KEY'],
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
  [AiTaskType.SKILL_TAXONOMY_RESOLVER]: {
    provider: 'gemini',
    model: 'gemini-2.0-flash',
    apiKeysEnv: ['GEMINI_API_KEY'],
    responseSchema: SkillTaxonomySchema,
    temperature: 0.1, // Deterministic - keep it precise
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'groq',
        model: 'gemma2-9b-it',
        apiKeysEnv: ['GROQ_API_KEY'],
      },
    ],
  },
  [AiTaskType.QUIZ_BATCH_EVALUATION]: {
    provider: 'groq',
    model: 'mixtral-8x7b-32768',
    apiKeysEnv: ['GROQ_API_KEY'],
    responseSchema: QuizBatchEvaluationSchema,
    temperature: 0.3, // Low temperature for factual grading
    maxRetries: 2,
    fallbacks: [
      {
        provider: 'gemini',
        model: 'gemini-2.0-pro-exp-02-05',
        apiKeysEnv: ['GEMINI_API_KEY'],
      },
    ],
  },
};



