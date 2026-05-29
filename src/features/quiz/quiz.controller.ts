import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { StartQuizCommand } from './commands/impl/start-quiz.command';
import { SelectModeCommand } from './commands/impl/select-mode.command';
import { SubmitAnswerCommand } from './commands/impl/submit-answer.command';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SelectModeDto } from './dto/select-mode.dto';
import { AnswerQuizDto } from './dto/answer-quiz.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { QuizStateResponse } from './interfaces/quiz-state.interface';
import { QuotaService } from '../../infrastructure/quota/quota.service';

@ApiTags('Quiz')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('quiz')
export class QuizController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly quotaService: QuotaService,
  ) {}

  @Post('start')
  async startQuiz(
    @CurrentUser() userId: string,
    @Body() dto: StartQuizDto,
  ): Promise<QuizStateResponse> {
    await this.quotaService.checkAndConsumeQuota(userId, 'QUIZ');
    return this.commandBus.execute(new StartQuizCommand(userId, dto.topic));
  }

  @Post('mode')
  async selectMode(
    @CurrentUser() userId: string,
    @Body() dto: SelectModeDto,
  ): Promise<QuizStateResponse> {
    return this.commandBus.execute(new SelectModeCommand(userId, dto.mode, dto.topic));
  }

  @Post('answer')
  async submitAnswer(
    @CurrentUser() userId: string,
    @Body() dto: AnswerQuizDto,
  ): Promise<QuizStateResponse> {
    return this.commandBus.execute(new SubmitAnswerCommand(userId, dto.answerText));
  }
}
