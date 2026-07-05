import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Daftarkan akun pengguna baru' })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil' })
  @ApiResponse({ status: 409, description: 'Email atau username sudah terdaftar' })
  async register(@Body() payload: RegisterDto): Promise<{ message: string }> {
    return this.authService.register(payload);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login dan dapatkan access token JWT' })
  @ApiResponse({ status: 200, description: 'Login berhasil, mengembalikan accessToken' })
  @ApiResponse({ status: 401, description: 'Email atau password salah' })
  async login(
    @Body() payload: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; accessToken: string }> {
    return this.authService.login(payload, res);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token menggunakan refresh token dari cookie' })
  @ApiResponse({ status: 200, description: 'Access token baru berhasil digenerate' })
  @ApiResponse({ status: 401, description: 'Refresh token tidak valid atau expired' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    return this.authService.refresh(req, res);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout dan hapus refresh token' })
  @ApiResponse({ status: 200, description: 'Logout berhasil' })
  async logout(
    @CurrentUser() userId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(userId, res);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Minta OTP untuk reset password' })
  @ApiResponse({ status: 200, description: 'OTP berhasil dikirim ke email' })
  async forgotPassword(@Body() payload: ForgotPasswordDto): Promise<{ message: string }> {
    return this.authService.forgotPassword(payload);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({ status: 200, description: 'Password berhasil diubah' })
  @ApiResponse({ status: 400, description: 'Konfirmasi password tidak cocok' })
  async resetPassword(@Body() payload: ResetPasswordDto): Promise<{ message: string }> {
    return this.authService.resetPassword(payload);
  }
}

