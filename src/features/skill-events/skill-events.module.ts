import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { SkillEventsService } from './skill-events.service';
import { SkillEventsController } from './skill-events.controller';
import { ProgressionSharedModule } from '../../shared/progression/progression-shared.module';
import { UserSkillsModule } from '../user-skills/user-skills.module';

import { SkillEventsRepository } from './skill-events.repository';
import { SkillEvidenceListener } from './listeners/skill-evidence.listener';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [
    PrismaModule,
    ProgressionSharedModule,
    UserSkillsModule,
    SkillsModule, // Needed by listener
  ],
  controllers: [SkillEventsController],
  providers: [
    SkillEventsService,
    SkillEventsRepository,
    SkillEvidenceListener,
  ],
  exports: [
    SkillEventsService,
    SkillEventsRepository,
  ],
})
export class SkillEventsModule {}
