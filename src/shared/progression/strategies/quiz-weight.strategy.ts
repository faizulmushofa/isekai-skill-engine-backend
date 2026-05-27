import { Injectable } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { EvidenceWeightStrategy } from './evidence-weight.strategy';
import { CalibrationParams } from '../interfaces/progression.interfaces';
import { SkillEngineCalibration } from '../calibration/skill-engine-calibration';

@Injectable()
export class QuizWeightStrategy implements EvidenceWeightStrategy {
  readonly sourceType = SourceType.QUIZ;

  constructor(private readonly calibration: SkillEngineCalibration) {}

  getCalibration(): CalibrationParams {
    return this.calibration.getParams(this.sourceType);
  }
}
