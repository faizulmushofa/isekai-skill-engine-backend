import { Module } from '@nestjs/common';
import { CareerGoalSkillsService } from './career-goal-skills.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CareerGoalSkillsService],
  exports: [CareerGoalSkillsService],
})
export class CareerGoalSkillsModule {}
