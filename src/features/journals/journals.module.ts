import { Module } from '@nestjs/common';
import { JournalsService } from './journals.service';
import { JournalsController } from './journals.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { SkillEventsModule } from '../skill-events/skill-events.module';
import { SkillsModule } from '../skills/skills.module';


import { JournalsRepository } from './journals.repository';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
    SkillEventsModule,
    SkillsModule,
  ],
  controllers: [JournalsController],
  providers: [JournalsService, JournalsRepository],
  exports: [JournalsService, JournalsRepository],
})
export class JournalsModule {}
