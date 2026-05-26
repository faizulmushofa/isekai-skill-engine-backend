jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtService } from '../../../infrastructure/jwt/jwt.service';
import { Response, Request } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  // Mock JwtService hanya untuk di-inject ke JwtAuthGuard oleh NestJS Test
  const mockJwtService = {
    verifyAccessToken: jest.fn(),
  };

  const mockUserResponse = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  const mockResponse = {} as any as Response;
  const mockRequest = {} as any as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('harus memanggil authService.register dan mengembalikan UserResponse', async () => {
      mockAuthService.register.mockResolvedValue(mockUserResponse);
      
      const payload = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = await controller.register(payload);

      expect(result).toEqual(mockUserResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(payload);
    });
  });

  describe('login', () => {
    it('harus memanggil authService.login dan meneruskan res objek', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'access_token_123',
      });

      const payload = { identifier: 'testuser', password: 'password123' };
      
      const result = await controller.login(payload, mockResponse);

      expect(result).toEqual({ accessToken: 'access_token_123' });
      expect(mockAuthService.login).toHaveBeenCalledWith(payload, mockResponse);
    });
  });

  describe('refresh', () => {
    it('harus memanggil authService.refresh dengan meneruskan req dan res', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new_access_token',
      });

      const result = await controller.refresh(mockRequest, mockResponse);

      expect(result).toEqual({ accessToken: 'new_access_token' });
      expect(mockAuthService.refresh).toHaveBeenCalledWith(mockRequest, mockResponse);
    });
  });

  describe('logout', () => {
    it('harus memanggil authService.logout dengan meneruskan ID user dan res', async () => {
      // @CurrentUser() sudah meng-resolve userId sebelum masuk handler
      await controller.logout('user-uuid-1', mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user-uuid-1', mockResponse);
    });
  });
});
