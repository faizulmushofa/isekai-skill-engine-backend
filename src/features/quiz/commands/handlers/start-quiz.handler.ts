import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException } from '@nestjs/common';
import { StartQuizCommand } from '../impl/start-quiz.command';
import { QuizStateResponse } from '../../interfaces/quiz-state.interface';

@CommandHandler(StartQuizCommand)
export class StartQuizHandler implements ICommandHandler<StartQuizCommand, QuizStateResponse> {
  async execute(command: StartQuizCommand): Promise<QuizStateResponse> {
    const { topic } = command;
    if (!topic || !topic.trim()) {
      throw new BadRequestException('Topic tidak boleh kosong');
    }

    return {
      state: 'DECISION_REQUIRED',
      message: `Kamu mau:\n1. Cerita belajar saja\n2. Diuji (7 soal adaptif)\n\nBalas: 1 atau 2`,
      data: {
        topic: topic.trim(),
      },
    };
  }
}
