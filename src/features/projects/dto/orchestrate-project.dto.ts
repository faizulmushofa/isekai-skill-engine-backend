import { ApiProperty } from '@nestjs/swagger';

export class OrchestrateProjectDto {
  @ApiProperty({
    required: false,
    example: 'https://github.com/hero/isekai-backend',
    description: 'URL Git repositori (opsional, jika ingin meng-override data DB)',
  })
  repositoryUrl?: string;

  @ApiProperty({
    required: false,
    example: 'abc1234',
    description: 'Hash commit baru untuk dibandingkan (jika mode COMMIT)',
  })
  commitHash?: string;

  @ApiProperty({
    required: false,
    example: 'INIT',
    enum: ['INIT', 'COMMIT'],
    description: 'Petunjuk mode analisis',
  })
  modeHint?: 'INIT' | 'COMMIT';

  @ApiProperty({
    required: false,
    example: false,
    description: 'Menandakan jika analisis sebelumnya sudah pernah dijalankan',
  })
  previousAnalysisExists?: boolean;
}
