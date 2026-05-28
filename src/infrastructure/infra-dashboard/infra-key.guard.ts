import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class InfraKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const key = request.query.key || request.headers['x-infra-key'];
    
    // Fallback to a hardcoded key if env is missing, for development ease
    const expectedKey = process.env.INFRA_SECRET_KEY;
    
    if (key === expectedKey) {
      return true;
    }
    
    throw new UnauthorizedException('Invalid infrastructure key.');
  }
}
