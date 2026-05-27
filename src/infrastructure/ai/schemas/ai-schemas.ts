import { z } from 'zod';

export const LearningEvidenceSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']),
      evidence: z.array(z.string()),
      reason: z.string(),
    }),
  ),
});

export const AssessmentGeneratorSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      type: z.enum(['ESSAY', 'ANALYTICAL']),
      guideline: z.string(),
    }),
  ),
});

export const ProjectEvidenceSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
      complexity: z.enum(['beginner', 'intermediate', 'advanced']),
      evidence: z.array(z.string()),
      reason: z.string(),
    }),
  ),
});

export const BehavioralCareerAlignmentSchema = z.object({
  careerGoals: z.array(
    z.object({
      title: z.string(),
      confidence: z.number().min(0).max(1),
      matchFactors: z.array(z.string()),
      reason: z.string(),
    }),
  ),
});
