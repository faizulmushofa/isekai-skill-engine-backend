import { IsEmail, IsNotEmpty, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Format email tidak valid' })
  @IsNotEmpty({ message: 'Email tidak boleh kosong' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty({ message: 'OTP code wajib diisi' })
  @Length(6, 6, { message: 'OTP code harus terdiri dari 6 karakter' })
  otpCode: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  newPassword: string;

  @ApiProperty({ example: 'newPassword123' })
  @IsString()
  @IsNotEmpty({ message: 'Konfirmasi password wajib diisi' })
  @MinLength(6, { message: 'Konfirmasi password minimal 6 karakter' })
  confirmPassword: string;
}
