import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../../../infrastructure/jwt/jwt.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Header Authorization tidak ditemukan');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Format token Authorization harus menggunakan skema Bearer');
    }

    const token = authHeader.split(' ')[1];
    if (!token || token.trim() === '') {
      throw new UnauthorizedException('Token Authorization tidak ditemukan');
    }

    try {
      const payload = this.jwtService.verifyAccessToken(token);
      request.user = { id: payload.userId };
      return true;
    } catch (err) {
      throw new UnauthorizedException('Sesi tidak valid atau access token telah kedaluwarsa');
    }
  }
}
