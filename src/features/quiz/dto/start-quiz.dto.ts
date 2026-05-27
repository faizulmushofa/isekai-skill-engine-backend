import { ApiProperty } from '@nestjs/swagger';

export class StartQuizDto {
  @ApiProperty({ example: 'Backend Security', description: 'Topik kuis / nama skill' })
  topic!: string;
}
