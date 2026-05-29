import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { SkillsModule } from '../skills/skills.module';
import { SkillEventsModule } from '../skill-events/skill-events.module';
import { GitProcessingModule } from '../../infrastructure/git-processing/git-processing.module';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
    SkillsModule,
    SkillEventsModule,
    GitProcessingModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
