import {
  Injectable,
  UnauthorizedException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtService } from '../../infrastructure/jwt/jwt.service';
import { PASSWORD_SERVICE_TOKEN } from '../../shared/security/password.service.interface';
import type { IPasswordService } from '../../shared/security/password.service.interface';
import { UserResponse } from '../users/mapper/user.mapper';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';

import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    @Inject(PASSWORD_SERVICE_TOKEN)
    private readonly passwordService: IPasswordService,
  ) {}

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async register(payload: RegisterDto): Promise<{ message: string; email: string }> {
    if (!payload || !payload.email || !payload.username || !payload.password) {
      throw new BadRequestException('Email, username, dan password wajib diisi');
    }

    const existingUser = await this.usersService.findRawByEmail(payload.email);
    if (existingUser) {
      throw new BadRequestException('Email sudah terdaftar.');
    }

    const passwordHash = await this.passwordService.hash(payload.password);

    await this.usersService.createUser({
      email: payload.email,
      username: payload.username,
      passwordHash,
      isEmailVerified: true,
    });

    return { message: 'Register successful', email: payload.email };
  }

  async login(
    payload: LoginDto,
    res: Response,
  ): Promise<{ message: string; accessToken: string }> {
    if (!payload || !payload.email || !payload.password) {
      throw new BadRequestException('Email dan password wajib diisi');
    }
    const user = await this.usersService.findRawByEmail(payload.email);
    if (!user) {
      throw new UnauthorizedException('Kredensial login tidak valid');
    }

    const isPasswordValid = await this.passwordService.compare(
      payload.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Kredensial login tidak valid');
    }

    const accessToken = this.jwtService.signAccessToken({ userId: user.id });
    const refreshToken = this.jwtService.signRefreshToken({ userId: user.id });

    // Store refresh token hash in DB
    const refreshTokenHash = this.hashToken(refreshToken);
    await this.usersService.updateRefreshTokenHash(user.id, refreshTokenHash);

    // Set refresh token in HttpOnly cookie via JwtService (Infrastructure mechanics)
    this.jwtService.setRefreshTokenCookie(res, refreshToken);

    return {
      message: 'Login successful',
      accessToken,
    };
  }

  async refresh(req: Request, res: Response): Promise<{ accessToken: string }> {
    // 1. Ekstrak refresh token via JwtService
    const refreshToken = this.jwtService.extractRefreshToken(req);
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Sesi tidak ditemukan (Refresh token tidak ada di cookie)',
      );
    }

    // 2. Verifikasi refresh token via JWT Infrastructure
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // 3. Cari data pengguna
    const user = await this.usersService.findRawById(payload.userId);
    if (!user) {
      throw new UnauthorizedException('Sesi tidak ditemukan');
    }

    // 4. Bandingkan hash refresh token di DB
    const incomingHash = this.hashToken(refreshToken);
    if (!user.refreshTokenHash || user.refreshTokenHash !== incomingHash) {
      throw new UnauthorizedException(
        'Sesi tidak valid atau telah kedaluwarsa',
      );
    }

    // 5. Rotasi token (Buat token baru)
    const newAccessToken = this.jwtService.signAccessToken({ userId: user.id });
    const newRefreshToken = this.jwtService.signRefreshToken({
      userId: user.id,
    });

    // Update refresh token hash di DB
    const newRefreshTokenHash = this.hashToken(newRefreshToken);
    await this.usersService.updateRefreshTokenHash(
      user.id,
      newRefreshTokenHash,
    );

    // Set refresh token baru di HttpOnly cookie via JwtService
    this.jwtService.setRefreshTokenCookie(res, newRefreshToken);

    return { accessToken: newAccessToken };
  }

  async logout(userId: string, res: Response): Promise<void> {
    // Revoke refresh token in DB
    await this.usersService.updateRefreshTokenHash(userId, null);

    // Clear HttpOnly cookie via JwtService
    this.jwtService.clearRefreshTokenCookie(res);
  }

  async forgotPassword(payload: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findRawByEmail(payload.email);
    if (!user) {
      return { message: 'Jika email terdaftar, instruksi reset password telah dikirim.' };
    }
    return { message: 'Jika email terdaftar, instruksi reset password telah dikirim.' };
  }
  async resetPassword(payload: ResetPasswordDto): Promise<{ message: string }> {
    if (payload.newPassword !== payload.confirmPassword) {
      throw new BadRequestException('Konfirmasi password tidak cocok');
    }

    const user = await this.usersService.findRawByEmail(payload.email);
    if (!user) {
      throw new BadRequestException('Email tidak valid');
    }

    const passwordHash = await this.passwordService.hash(payload.newPassword);

    await this.usersService.updateSystemUser(user.id, {
      passwordHash,
      otpCode: null,
      otpExpiresAt: null,
    });

    return { message: 'Password berhasil diubah' };
  }
}
