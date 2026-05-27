import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuizService } from './quiz.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SelectModeDto } from './dto/select-mode.dto';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { QuizStateResponse } from './interfaces/quiz-state.interface';

@ApiTags('Quiz')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('start')
  async startQuiz(
    @CurrentUser() userId: string,
    @Body() dto: StartQuizDto,
  ): Promise<QuizStateResponse> {
    return this.quizService.startQuiz(userId, dto.topic);
  }

  @Post('mode')
  async selectMode(
    @CurrentUser() userId: string,
    @Body() dto: SelectModeDto,
  ): Promise<QuizStateResponse> {
    return this.quizService.selectMode(userId, dto.mode, dto.topic);
  }

  @Post('answer')
  async submitAnswer(
    @CurrentUser() userId: string,
    @Body() dto: AnswerQuizDto,
  ): Promise<QuizStateResponse> {
    return this.quizService.submitAnswer(userId, dto.answerText);
  }
}
