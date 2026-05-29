import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom parameter decorator yang mengekstrak userId dari request context.
 *
 * Sumber tunggal kebenaran (single source of truth) untuk mengambil
 * identitas user yang terautentikasi dari JWT payload yang sudah
 * divalidasi oleh JwtAuthGuard.
 *
 * @example
 * ```ts
 * @Get('me')
 * async getMe(@CurrentUser() userId: string) {
 *   return this.usersService.findById(userId);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Guard sudah memvalidasi token dan meng-set req.user = { id: payload.userId }
    // Fallback chain untuk kompatibilitas jika format payload berubah
    return user?.id || user?.userId || user?.sub;
  },
);
