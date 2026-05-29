import { Module } from '@nestjs/common';
import { UserSkillsService } from './user-skills.service';
import { UserSkillsAggregatorService } from './services/user-skills-aggregator.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ProgressionSharedModule } from '../../shared/progression/progression-shared.module';

@Module({
  imports: [
    PrismaModule,
    ProgressionSharedModule,
  ],
  providers: [
    UserSkillsService,
    UserSkillsAggregatorService,
  ],
  exports: [
    UserSkillsService,
    UserSkillsAggregatorService,
  ],
})
export class UserSkillsModule {}
