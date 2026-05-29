import { Module } from '@nestjs/common';
import { JournalsService } from './journals.service';
import { JournalsController } from './journals.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { SkillsModule } from '../skills/skills.module';
import { SkillEventsModule } from '../skill-events/skill-events.module';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
    SkillsModule,
    SkillEventsModule,
  ],
  controllers: [JournalsController],
  providers: [JournalsService],
  exports: [JournalsService],
})
export class JournalsModule {}
