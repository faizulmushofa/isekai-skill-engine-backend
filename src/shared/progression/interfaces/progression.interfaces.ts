import { SourceType } from '@prisma/client';

export interface CalibrationParams {
  alpha: number;
  weight: number;
}

export interface CalculationInput {
  userId: string;
  skillId: string;
  sourceType: SourceType;
  sourceId: string;
  rawScore: number;
  oldProgress: number;
}

export interface CalculationOutput {
  userId: string;
  skillId: string;
  sourceType: SourceType;
  sourceId: string;
  rawScore: number;
  weightedScore: number;
  oldProgress: number;
  newProgress: number;
  contribution: number;
  formulaVersion: string;
}
