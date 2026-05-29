import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class StartQuizDto {
  @ApiProperty({ example: 'Backend Security', description: 'Topik kuis / nama skill' })
  @IsString()
  @IsNotEmpty()
  topic!: string;
}
