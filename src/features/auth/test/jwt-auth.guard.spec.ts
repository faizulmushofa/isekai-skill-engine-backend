jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtService } from '../../../infrastructure/jwt/jwt.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  const mockJwtService = {
    verifyAccessToken: jest.fn(),
  };

  const createMockContext = (
    authHeader: string | undefined,
  ): ExecutionContext => {
    const request = {
      headers: {
        authorization: authHeader,
      },
      user: undefined,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any as ExecutionContext;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('harus mengizinkan akses dan menempelkan id pengguna ke request.user jika Bearer token valid', () => {
    const context = createMockContext('Bearer valid_access_token');
    mockJwtService.verifyAccessToken.mockReturnValue({ userId: 'user-uuid-1' });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    const request = context.switchToHttp().getRequest();
    expect(request.user).toEqual({ id: 'user-uuid-1' });
    expect(mockJwtService.verifyAccessToken).toHaveBeenCalledWith(
      'valid_access_token',
    );
  });

  it('harus melempar UnauthorizedException jika header Authorization tidak ada', () => {
    const context = createMockContext(undefined);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    expect(mockJwtService.verifyAccessToken).not.toHaveBeenCalled();
  });

  it('harus melempar UnauthorizedException jika skema Authorization bukan Bearer', () => {
    const context = createMockContext('Basic dGVzdDp0ZXN0');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('harus melempar UnauthorizedException jika token kosong', () => {
    const context = createMockContext('Bearer ');

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('harus melempar UnauthorizedException jika JwtService.verifyAccessToken melempar error', () => {
    const context = createMockContext('Bearer expired_token');
    mockJwtService.verifyAccessToken.mockImplementation(() => {
      throw new Error('Expired');
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });
});
