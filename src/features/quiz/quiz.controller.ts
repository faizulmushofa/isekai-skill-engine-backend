import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { DecisionDto } from './dto/decision.dto';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { QuizStateResponse } from './interfaces/quiz-state.interface';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('start')
  async startQuiz(
    @CurrentUser() userId: string,
    @Body() dto: StartQuizDto,
  ): Promise<QuizStateResponse> {
    return this.quizService.startQuiz(userId, dto.topic);
  }

  @Post('decision')
  async handleDecision(
    @CurrentUser() userId: string,
    @Body() dto: DecisionDto,
  ): Promise<QuizStateResponse> {
    return this.quizService.handleDecision(userId, dto.decision, dto.topic);
  }

  @Post('answer')
  async submitAnswer(@Body() dto: AnswerQuizDto): Promise<QuizStateResponse> {
    return this.quizService.submitAnswer(
      dto.attemptId,
      dto.questionId,
      dto.answerText,
    );
  }

  @Post('finish/:attemptId')
  async finishQuiz(
    @Param('attemptId') attemptId: string,
  ): Promise<QuizStateResponse> {
    return this.quizService.finishQuiz(attemptId);
  }
}
