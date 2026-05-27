import { ApiProperty } from '@nestjs/swagger';

export class AnswerQuizDto {
  @ApiProperty({ example: 'JWT is a stateless token format', description: 'Jawaban dari user' })
  answerText!: string;

  @ApiProperty({ required: false, description: 'Attempt ID (opsional, sesi dilacak secara in-memory)' })
  attemptId?: string;

  @ApiProperty({ required: false, description: 'Question ID (opsional)' })
  questionId?: string;
}
