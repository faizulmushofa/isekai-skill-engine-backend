import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';

@Injectable()
export class JwtService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || 'access_secret_123';
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || 'refresh_secret_123';
  private readonly accessTokenExpiry = '15m';
  private readonly refreshTokenExpiry = '7d';
  private readonly refreshTokenCookieName = 'refresh_token';

  signAccessToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.accessTokenSecret, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  signRefreshToken(payload: { userId: string }): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiry,
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
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
    });
  }

  // Menangani penghapusan cookie secara penuh di lapisan infrastruktur
  clearRefreshTokenCookie(res: Response): void {
    res.clearCookie(this.refreshTokenCookieName, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });
  }

  // Mengekstrak token secara penuh di lapisan infrastruktur
  extractRefreshToken(req: Request): string | undefined {
    return req.cookies?.[this.refreshTokenCookieName];
  }
}
