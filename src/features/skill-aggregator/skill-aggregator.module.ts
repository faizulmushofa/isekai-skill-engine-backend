import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { SkillAggregatorService } from './skill-aggregator.service';
import { SkillAggregatorController } from './skill-aggregator.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SkillAggregatorController],
  providers: [SkillAggregatorService],
  exports: [SkillAggregatorService],
})
export class SkillAggregatorModule {}
