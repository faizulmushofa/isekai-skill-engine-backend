import { Module } from '@nestjs/common';
import { SkillAggregatorService } from './skill-aggregator.service';
import { SkillAggregatorController } from './skill-aggregator.controller';

@Module({
  controllers: [SkillAggregatorController],
  providers: [SkillAggregatorService],
})
export class SkillAggregatorModule {}
