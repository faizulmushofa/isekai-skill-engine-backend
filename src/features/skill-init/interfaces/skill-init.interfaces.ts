// ──────────────────────────────────────────────────────────────────────────
// Skill-Init Session State
// ──────────────────────────────────────────────────────────────────────────

export type SkillInitStep =
  | 'CLASSIFY'
  | 'DISCOVERY'
  | 'CAREER_SELECTION'
  | 'SKILLS_GENERATION'
  | 'DONE';

export type SkillInitIntent = 'DIRECT_GOAL' | 'VAGUE_GOAL' | 'EMPTY';

export interface SkillInitSession {
  userId: string;
  step: SkillInitStep;
  intent?: SkillInitIntent;
  discoveryAnswers: string[];          // Answers to RIASEC questions
  currentQuestion?: string;            // The question currently being asked
  discoveredTraits: string[];          // Traits extracted after discovery complete
  careerOptions?: CareerOption[];      // Career options presented to user
  selectedCareer?: string;            // Career chosen by user
}

export interface CareerOption {
  title: string;
  confidence: number;
  matchFactors: string[];
  reason: string;
}

// ──────────────────────────────────────────────────────────────────────────
// API Response Contracts
// ──────────────────────────────────────────────────────────────────────────

export interface SkillInitStartResponse {
  step: SkillInitStep;
  intent: SkillInitIntent;
  message: string;
  // Present if intent === DIRECT_GOAL (skips discovery)
  careerOptions?: CareerOption[];
  // Present if intent === VAGUE_GOAL or EMPTY (begins discovery)
  question?: string;
  dimension?: string;
}

export interface SkillInitAnswerResponse {
  step: SkillInitStep;
  message: string;
  // Next question if discovery ongoing
  question?: string;
  dimension?: string;
  // Career options if discovery just completed
  careerOptions?: CareerOption[];
}

export interface SkillInitSelectCareerResponse {
  step: 'DONE';
  message: string;
  initializedSkills: Array<{
    name: string;
    description: string;
    whyImportant: string;
  }>;
}
