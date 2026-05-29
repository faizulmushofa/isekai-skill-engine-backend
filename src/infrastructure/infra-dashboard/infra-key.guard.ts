import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '../jwt/jwt.service';

@Injectable()
export class InfraKeyGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const sessionCookie = request.cookies?.['infra_session'];

    // 1. Coba validasi via Cookie Biometric
    if (sessionCookie) {
      try {
        const payload = this.jwtService.verifyAccessToken(sessionCookie);
        if (payload.userId === 'infra_admin') {
          return true; // Lolos via Biometric
        }
      } catch (e) {
        // Abaikan error JWT, lanjut ke fallback manual
      }
    }

    // 2. Fallback ke validasi Manual via Query Parameter / Header
    const key = request.query.key || request.headers['x-infra-key'];
    const expectedKey = process.env.INFRA_SECRET_KEY;
    
    if (!expectedKey) {
      throw new UnauthorizedException('Infrastructure key is not configured in the environment.');
    }
    
    if (key && typeof key === 'string') {
      try {
        // Mencegah Timing Attack menggunakan crypto.timingSafeEqual
        const keyBuffer = Buffer.from(key, 'utf-8');
        const expectedBuffer = Buffer.from(expectedKey, 'utf-8');
        
        if (keyBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
          return true;
        }
      } catch (e) {
        // Abaikan error jika panjang buffer berbeda atau lainnya
      }
    }
    
    throw new UnauthorizedException('Invalid infrastructure key or session.');
  }
}
