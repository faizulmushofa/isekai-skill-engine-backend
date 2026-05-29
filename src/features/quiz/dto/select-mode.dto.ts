import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class SelectModeDto {
  @ApiProperty({ example: 'Backend Security', description: 'Kuis topik / nama skill' })
  @IsString()
  @IsNotEmpty()
  topic!: string;

  @ApiProperty({ example: '2', enum: ['1', '2'], description: '1 = Story Mode, 2 = Scoring Mode' })
  @IsString()
  @IsIn(['1', '2'])
  mode!: '1' | '2';
}
