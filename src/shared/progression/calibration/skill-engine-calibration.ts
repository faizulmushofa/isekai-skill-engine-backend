import { Injectable } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { CalibrationParams } from '../interfaces/progression.interfaces';

@Injectable()
export class SkillEngineCalibration {
  /**
   * Current global formula configuration version.
   * Saved into the immutable SkillEvent metadata to guarantee deterministic historical replay.
   */
  readonly FORMULA_VERSION = 'v1.0';

  /**
   * Exponential decay rate for recursive score propagation up the hierarchy tree.
   * A child progress increase of Delta propagates to ancestors by: Delta * decay^distance
   */
  readonly PROPAGATION_DECAY = 0.40;


  private readonly params: Record<SourceType, CalibrationParams> = {
    [SourceType.JOURNAL]: {
      alpha: 0.10, // Moderate learning speed for persistent reflection
      weight: 0.30, // 30% importance weighting
    },
    [SourceType.PROJECT]: {
      alpha: 0.20, // Faster learning speed for concrete code contributions
      weight: 0.50, // 50% importance weighting
    },
    [SourceType.QUIZ]: {
      alpha: 0.15, // Medium learning speed for theoretical checkpoints
      weight: 0.20, // 20% importance weighting
    },
  };

  /**
   * Retrieves deterministic calibration parameters for a specific learning source.
   */
  getParams(sourceType: SourceType): CalibrationParams {
    const config = this.params[sourceType];
    if (!config) {
      throw new Error(`Calibration parameters not configured for source type: ${sourceType}`);
    }
    return config;
  }
}
