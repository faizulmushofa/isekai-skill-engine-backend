import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AnswerQuizDto {
  @ApiProperty({ example: 'JWT is a stateless token format', description: 'Jawaban dari user' })
  @IsString()
  @IsNotEmpty()
  answerText!: string;

  @ApiProperty({ required: false, description: 'Attempt ID (opsional, sesi dilacak secara in-memory)' })
  @IsString()
  @IsOptional()
  attemptId?: string;

  @ApiProperty({ required: false, description: 'Question ID (opsional)' })
  @IsString()
  @IsOptional()
  questionId?: string;
}
