import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { GitProcessingModule } from '../../infrastructure/git-processing/git-processing.module';

import { ProjectsRepository } from './projects.repository';
import { SkillsModule } from '../skills/skills.module';
import { SkillEventsModule } from '../skill-events/skill-events.module';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
    GitProcessingModule,
    SkillsModule,
    SkillEventsModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
