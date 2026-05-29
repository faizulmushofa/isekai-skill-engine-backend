/**
 * SkillMathEngine
 * 
 * Shared Calculation Layer (Math Core Engine).
 * 100% pure functions, stateless, deterministic, and completely decoupled
 * from database, Prisma, or business domain models.
 */
export class SkillMathEngine {
  /**
   * Clamps a numeric value within the range [min, max].
   */
  static clamp(value: number, min: number, max: number): number {
    if (isNaN(value)) return min;
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Scales a raw learning score using a weight factor.
   * Both inputs and outputs are typically bounded within [0, 100].
   */
  static scaleScore(rawScore: number, weight: number): number {
    const clampedRaw = this.clamp(rawScore, 0, 100);
    const clampedWeight = this.clamp(weight, 0, 1);
    return clampedRaw * clampedWeight;
  }

  /**
   * Applies the Bayesian progression formula:
   * newSkill = oldSkill + alpha * (evidence - oldSkill)
   * 
   * Bounded safely in the range [0.0, 100.0].
   */
  static bayesianUpdate(oldProgress: number, weightedScore: number, alpha: number): number {
    const clampedOld = this.clamp(oldProgress, 0, 100);
    const clampedWeighted = this.clamp(weightedScore, 0, 100);
    const clampedAlpha = this.clamp(alpha, 0, 1);

    const updated = clampedOld + clampedAlpha * (clampedWeighted - clampedOld);
    return this.clamp(updated, 0, 100);
  }

  /**
   * Computes the positive/negative delta change contribution of a state transition.
   */
  static computeContribution(oldProgress: number, newProgress: number): number {
    return newProgress - oldProgress;
  }
}
