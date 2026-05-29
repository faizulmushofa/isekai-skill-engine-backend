import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'agus@example.com', description: 'Gunakan email dari seed DB untuk testing' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'password', description: 'Gunakan password dari seed DB untuk testing' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
