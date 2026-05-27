import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'agus@example.com', description: 'Gunakan email dari seed DB untuk testing' })
  email!: string;

  @ApiProperty({ example: 'password', description: 'Gunakan password dari seed DB untuk testing' })
  password!: string;
}

