import { z } from 'zod';

const robustComplexityPreprocess = (val: unknown) => {
  if (typeof val !== 'string') return 'beginner';
  const lower = val.toLowerCase().trim();
  if (['beginner', 'intermediate', 'advanced'].includes(lower)) return lower;
  if (lower.includes('begin') || lower.includes('awal') || lower.includes('pemula')) return 'beginner';
  if (lower.includes('inter') || lower.includes('menengah')) return 'intermediate';
  if (lower.includes('adv') || lower.includes('mahir') || lower.includes('lanjut')) return 'advanced';
  return 'beginner';
};

export const LearningEvidenceSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      confidence: z.number().min(0).max(1),
      complexity: z.preprocess(robustComplexityPreprocess, z.enum(['beginner', 'intermediate', 'advanced'])),
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
      parentId: z.string().nullable().optional(),
      confidence: z.number().min(0).max(1),
      complexity: z.preprocess(robustComplexityPreprocess, z.enum(['beginner', 'intermediate', 'advanced'])),
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

export const SkillInitClassificationSchema = z.object({
  intent: z.enum(['DIRECT_GOAL', 'VAGUE_GOAL', 'EMPTY']),
  careerName: z.string().nullish(), // Present only when intent = DIRECT_GOAL
});

export const SkillInitAdaptiveQuestionSchema = z.object({
  question: z.string(),
  dimension: z.enum(['REALISTIC', 'INVESTIGATIVE', 'ARTISTIC', 'SOCIAL', 'ENTERPRISING', 'CONVENTIONAL']),
  isDiscoveryComplete: z.boolean(),
  discoveredTraits: z.array(z.string()).nullish(), // Present when isDiscoveryComplete = true
});

export const SkillInitSkillsExplanatorSchema = z.object({
  skills: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      whyImportant: z.string(),
      isSpecificOrChildSkill: z.boolean().refine((val) => val === false, {
        message:
          "SANGAT DILARANG: Skill ini terdeteksi sebagai sub-skill atau skill spesifik. Anda hanya boleh membuat ROOT skill yang sangat general. Hapus skill ini dan ganti dengan root skill-nya.",
      }),
    }),
  ),
});

export const SkillTaxonomySchema = z.object({
  parentId: z.string().nullable(),
  reason: z.string(),
});

export const QuizBatchEvaluationSchema = z.object({
  sessionScore: z.number(),
  questionEvaluations: z.array(
    z.object({
      questionId: z.string(),
      scores: z.object({
        theory: z.number(),
        analysis: z.number(),
        caseStudy: z.number(),
      }),
      finalScore: z.number(),
    }),
  ),
  skillBreakdown: z.array(
    z.object({
      skillNode: z.string(),
      evidenceScore: z.number(),
    }),
  ),
});



