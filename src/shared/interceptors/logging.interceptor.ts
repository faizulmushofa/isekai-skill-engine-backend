import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    
    // Skip logging for swagger endpoints if desired, though we'll keep it simple and log everything
    const startTime = Date.now();

    this.logger.log(`[REQ] ${method} ${originalUrl} - IP: ${ip} - UA: ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: () => {
          const { statusCode } = res;
          const delay = Date.now() - startTime;
          this.logger.log(`[RES] ${method} ${originalUrl} ${statusCode} - ${delay}ms`);
        },
        error: (error) => {
          const statusCode = error?.status || error?.statusCode || 500;
          const delay = Date.now() - startTime;
          this.logger.error(`[ERR] ${method} ${originalUrl} ${statusCode} - ${delay}ms - ${error.message}`);
        },
      }),
    );
  }
}
