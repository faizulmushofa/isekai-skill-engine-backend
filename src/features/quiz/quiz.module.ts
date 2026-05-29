import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizRepository } from './quiz.repository';
import { QuizEngine } from './quiz.engine';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { SkillsModule } from '../skills/skills.module';
import { SkillEventsModule } from '../skill-events/skill-events.module';

@Module({
  imports: [PrismaModule, AiModule, SkillsModule, SkillEventsModule],
  controllers: [QuizController],
  providers: [QuizService, QuizRepository, QuizEngine],
  exports: [QuizService, QuizRepository, QuizEngine],
})
export class QuizModule {}
