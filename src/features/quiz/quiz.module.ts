import { Module } from '@nestjs/common';

import { QuizController } from './quiz.controller';
import { QuizRepository } from './quiz.repository';
import { QuizEngine } from './quiz.engine';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { AiModule } from '../../infrastructure/ai/ai.module';

import { CqrsModule } from '@nestjs/cqrs';
import { StartQuizHandler } from './commands/handlers/start-quiz.handler';
import { SelectModeHandler } from './commands/handlers/select-mode.handler';
import { SubmitAnswerHandler } from './commands/handlers/submit-answer.handler';
import { QuizSessionStore } from './services/quiz-session.store';

const CommandHandlers = [StartQuizHandler, SelectModeHandler, SubmitAnswerHandler];

@Module({
  imports: [CqrsModule, PrismaModule, AiModule],
  controllers: [QuizController],
  providers: [QuizRepository, QuizEngine, QuizSessionStore, ...CommandHandlers],
  exports: [QuizRepository, QuizEngine],
})
export class QuizModule {}
