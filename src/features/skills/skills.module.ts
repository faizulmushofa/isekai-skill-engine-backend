import { Module } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { SkillTaxonomyService } from './services/skill-taxonomy.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

import { SkillsRepository } from './skills.repository';

@Module({
  imports: [
    PrismaModule,
    AiModule,
  ],
  controllers: [SkillsController],
  providers: [
    SkillsService,
    SkillTaxonomyService,
    SkillsRepository,
  ],
  exports: [
    SkillsService,
    SkillsRepository,
  ],
})
export class SkillsModule {}
