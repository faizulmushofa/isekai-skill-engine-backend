import { SourceType } from '@prisma/client';
import { CalibrationParams } from '../interfaces/progression.interfaces';

export interface EvidenceWeightStrategy {
  readonly sourceType: SourceType;
  getCalibration(): CalibrationParams;
}
