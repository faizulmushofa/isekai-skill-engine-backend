import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class OrchestrateProjectDto {
  @ApiProperty({
    required: false,
    example: 'https://github.com/hero/isekai-backend',
    description: 'URL Git repositori (opsional, jika ingin meng-override data DB)',
  })
  @IsString()
  @IsOptional()
  repositoryUrl?: string;

  @ApiProperty({
    required: false,
    example: 'abc1234',
    description: 'Hash commit baru untuk dibandingkan (jika mode COMMIT)',
  })
  @IsString()
  @IsOptional()
  commitHash?: string;

  @ApiProperty({
    required: false,
    example: 'INIT',
    enum: ['INIT', 'COMMIT'],
    description: 'Petunjuk mode analisis',
  })
  @IsOptional()
  @IsIn(['INIT', 'COMMIT'])
  modeHint?: 'INIT' | 'COMMIT';

  @ApiProperty({
    required: false,
    example: false,
    description: 'Menandakan jika analisis sebelumnya sudah pernah dijalankan',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  previousAnalysisExists?: boolean;
}
