import { Module } from '@nestjs/common';
import { JournalsService } from './journals.service';
import { JournalsController } from './journals.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { ExtractionModule } from '../../infrastructure/extraction/extraction.module';
import { AiModule } from '../../infrastructure/ai/ai.module';


import { JournalsRepository } from './journals.repository';

@Module({
  imports: [
    PrismaModule,
    ExtractionModule,
    AiModule,
  ],
  controllers: [JournalsController],
  providers: [JournalsService, JournalsRepository],
  exports: [JournalsService, JournalsRepository],
})
export class JournalsModule {}
