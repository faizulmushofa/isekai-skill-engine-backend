import { Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { QuizRepository } from './quiz.repository';
import { QuizEngine } from './quiz.engine';

@Module({
  controllers: [QuizController],
  providers: [QuizService, QuizRepository, QuizEngine],
  exports: [QuizService, QuizRepository, QuizEngine],
})
export class QuizModule {}
