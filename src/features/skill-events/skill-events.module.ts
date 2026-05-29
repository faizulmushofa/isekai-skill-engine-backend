import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { SkillEventsService } from './skill-events.service';
import { SkillEventsController } from './skill-events.controller';
import { ProgressionSharedModule } from '../../shared/progression/progression-shared.module';
import { UserSkillsModule } from '../user-skills/user-skills.module';

@Module({
  imports: [
    PrismaModule,
    ProgressionSharedModule,
    UserSkillsModule,
  ],
  controllers: [SkillEventsController],
  providers: [
    SkillEventsService,
  ],
  exports: [
    SkillEventsService,
  ],
})
export class SkillEventsModule {}
