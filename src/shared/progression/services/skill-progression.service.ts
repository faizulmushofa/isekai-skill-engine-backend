import { Injectable } from '@nestjs/common';
import { CalculationInput, CalculationOutput } from '../interfaces/progression.interfaces';
import { WeightStrategyFactory } from '../strategies/weight-strategy.factory';
import { SkillEngineCalibration } from '../calibration/skill-engine-calibration';
import { SkillMathEngine } from '../math/skill-math.engine';

@Injectable()
export class SkillProgressionService {
  constructor(
    private readonly strategyFactory: WeightStrategyFactory,
    private readonly calibration: SkillEngineCalibration,
  ) {}

  /**
   * Orchestrates the skill progression computation.
   * Couples context parameters with the pure, stateless Math Core Engine.
   */
  computeProgress(input: CalculationInput): CalculationOutput {
    // 1. Resolve weight strategy
    const strategy = this.strategyFactory.getStrategy(input.sourceType);
    const { alpha, weight } = strategy.getCalibration();

    // 2. Perform stateless mathematical computations
    const weightedScore = SkillMathEngine.scaleScore(input.rawScore, weight);
    const newProgress = SkillMathEngine.bayesianUpdate(input.oldProgress, weightedScore, alpha);
    const contribution = SkillMathEngine.computeContribution(input.oldProgress, newProgress);

    return {
      userId: input.userId,
      skillId: input.skillId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      rawScore: input.rawScore,
      weightedScore,
      oldProgress: input.oldProgress,
      newProgress,
      contribution,
      formulaVersion: this.calibration.FORMULA_VERSION,
    };
  }
}
