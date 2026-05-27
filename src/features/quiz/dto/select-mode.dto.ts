import { ApiProperty } from '@nestjs/swagger';

export class SelectModeDto {
  @ApiProperty({ example: 'Backend Security', description: 'Kuis topik / nama skill' })
  topic!: string;

  @ApiProperty({ example: '2', enum: ['1', '2'], description: '1 = Story Mode, 2 = Scoring Mode' })
  mode!: '1' | '2';
}
