import { Module } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { GitProcessingModule } from '../../infrastructure/git-processing/git-processing.module';

import { ProjectsRepository } from './projects.repository';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
    GitProcessingModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsService, ProjectsRepository],
})
export class ProjectsModule {}
