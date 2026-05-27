import { Module } from '@nestjs/common';
import { SkillEngineCalibration } from './calibration/skill-engine-calibration';
import { JournalWeightStrategy } from './strategies/journal-weight.strategy';
import { ProjectWeightStrategy } from './strategies/project-weight.strategy';
import { QuizWeightStrategy } from './strategies/quiz-weight.strategy';
import { WeightStrategyFactory } from './strategies/weight-strategy.factory';
import { SkillProgressionService } from './services/skill-progression.service';

@Module({
  providers: [
    SkillEngineCalibration,
    JournalWeightStrategy,
    ProjectWeightStrategy,
    QuizWeightStrategy,
    WeightStrategyFactory,
    SkillProgressionService,
  ],
  exports: [
    SkillEngineCalibration,
    WeightStrategyFactory,
    JournalWeightStrategy,
    ProjectWeightStrategy,
    QuizWeightStrategy,
    SkillProgressionService,
  ],
})
export class ProgressionSharedModule {}
