import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { ConfigService } from '../config/config.service';

@Injectable()
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly refreshTokenCookieName = 'aether_refresh_token';

  constructor(private configService: ConfigService) {
    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const accessExpiry = this.configService.get<string>('JWT_EXPIRES_IN');
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN');

    if (!accessSecret) {
      throw new Error('FATAL ERROR: JWT_ACCESS_SECRET is missing in .env');
    }
    if (!refreshSecret) {
      throw new Error('FATAL ERROR: JWT_REFRESH_SECRET is missing in .env');
    }
    if (!accessExpiry) {
      throw new Error('FATAL ERROR: JWT_EXPIRES_IN is missing in .env');
    }
    if (!refreshExpiry) {
      throw new Error('FATAL ERROR: JWT_REFRESH_EXPIRES_IN is missing in .env');
    }

    this.accessTokenSecret = accessSecret;
    this.refreshTokenSecret = refreshSecret;
    this.accessTokenExpiry = accessExpiry;
    this.refreshTokenExpiry = refreshExpiry;
  }

  signAccessToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry as any,
    });
  }

  signRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry as any,
    });
  }

  verifyAccessToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, this.accessTokenSecret) as { userId: string };
    } catch (err) {
      throw new UnauthorizedException(
        'Access token tidak valid atau telah kedaluwarsa',
      );
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      return jwt.verify(token, this.refreshTokenSecret) as { userId: string };
    } catch (err) {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau telah kedaluwarsa',
      );
    }
  }

  // Menangani penulisan cookie secara penuh di lapisan infrastruktur
  setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie(this.refreshTokenCookieName, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });
  }

  // Menangani penghapusan cookie secara penuh di lapisan infrastruktur
  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(this.refreshTokenCookieName, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  }

  // Mengekstrak token secara penuh di lapisan infrastruktur
  extractRefreshToken(req: Request): string | undefined {
    return req.cookies?.[this.refreshTokenCookieName];
  }
}
