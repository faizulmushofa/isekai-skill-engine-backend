jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '../../../infrastructure/jwt/jwt.service';
import { PASSWORD_SERVICE_TOKEN } from '../../../shared/security/password.service.interface';
import { UnauthorizedException } from '@nestjs/common';
import { Response, Request } from 'express';
import * as crypto from 'crypto';
import { MailService } from '../../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUsersService = {
    createUser: jest.fn(),
    findRawByEmail: jest.fn(),
    findRawById: jest.fn(),
    updateRefreshTokenHash: jest.fn(),
  };

  const mockJwtService = {
    signAccessToken: jest.fn(),
    signRefreshToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
    setRefreshTokenCookie: jest.fn(),
    clearRefreshTokenCookie: jest.fn(),
    extractRefreshToken: jest.fn(),
  };

  const mockPasswordService = {
    hash: jest.fn(),
    compare: jest.fn(),
  };

  const mockMailService = {
    sendOtpEmail: jest.fn(),
  };

  const mockUserResponse = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  const mockRawUser = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed_password',
    refreshTokenHash: null as string | null,
    isEmailVerified: true,
    createdAt: new Date(),
  };

  const mockResponse = {} as any as Response;
  const mockRequest = {} as any as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: PASSWORD_SERVICE_TOKEN,
          useValue: mockPasswordService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('harus meng-hash password dan memanggil usersService.createUser serta mailService.sendOtpEmail', async () => {
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue(mockUserResponse);
      mockUsersService.findRawByEmail.mockResolvedValue(null);
      mockMailService.sendOtpEmail.mockResolvedValue(undefined);

      const payload = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      const result = await service.register(payload);

      expect(result).toEqual({
        message: 'Register successful, please verify OTP',
        email: 'test@example.com',
      });
      expect(mockPasswordService.hash).toHaveBeenCalledWith('password123');
      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed_password',
        otpCode: expect.any(String),
        otpExpiresAt: expect.any(Date),
      });
      expect(mockMailService.sendOtpEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(String),
      );
    });

    it('harus melakukan rollback (menghapus user baru) dan melempar BadRequestException jika pengiriman email OTP gagal', async () => {
      mockPasswordService.hash.mockResolvedValue('hashed_password');
      mockUsersService.createUser.mockResolvedValue(mockUserResponse);
      mockUsersService.findRawByEmail.mockResolvedValue(null);
      mockMailService.sendOtpEmail.mockRejectedValue(new Error('Brevo service down'));
      mockUsersService.deleteUser = jest.fn().mockResolvedValue(undefined);

      const payload = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
      };

      await expect(service.register(payload)).rejects.toThrow(
        'Gagal mengirim email OTP. Silakan coba beberapa saat lagi.',
      );

      expect(mockUsersService.createUser).toHaveBeenCalled();
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith(mockUserResponse.id);
    });
  });

  describe('login', () => {
    it('harus berhasil login jika kredensial cocok, menaruh hash di DB, mengeset cookie via JwtService, dan mengembalikan token', async () => {
      mockUsersService.findRawByEmail.mockResolvedValue(mockRawUser);
      mockPasswordService.compare.mockResolvedValue(true);
      mockJwtService.signAccessToken.mockReturnValue('access_token_123');
      mockJwtService.signRefreshToken.mockReturnValue('refresh_token_123');

      const payload = { email: 'test@example.com', password: 'password123' };
      const result = await service.login(payload, mockResponse);

      expect(result).toEqual({
        message: 'Login successful',
        accessToken: 'access_token_123',
      });

      expect(mockUsersService.findRawByEmail).toHaveBeenCalledWith(
        'test@example.com',
      );
      expect(mockPasswordService.compare).toHaveBeenCalledWith(
        'password123',
        'hashed_password',
      );

      const expectedHash = crypto
        .createHash('sha256')
        .update('refresh_token_123')
        .digest('hex');
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-uuid-1',
        expectedHash,
      );
      expect(mockJwtService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'refresh_token_123',
      );
    });

    it('harus melempar UnauthorizedException jika pengguna tidak ditemukan', async () => {
      mockUsersService.findRawByEmail.mockResolvedValue(null);

      const payload = {
        email: 'nonexistent@example.com',
        password: 'password',
      };

      await expect(service.login(payload, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockPasswordService.compare).not.toHaveBeenCalled();
    });

    it('harus melempar UnauthorizedException jika password tidak cocok', async () => {
      mockUsersService.findRawByEmail.mockResolvedValue(mockRawUser);
      mockPasswordService.compare.mockResolvedValue(false);

      const payload = { email: 'test@example.com', password: 'wrongpassword' };

      await expect(service.login(payload, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh', () => {
    it('harus berhasil memutar token jika refresh token valid, hash cocok, dan menyetel kuki via JwtService', async () => {
      const validRefreshToken = 'valid_refresh_token';
      const tokenHash = crypto
        .createHash('sha256')
        .update(validRefreshToken)
        .digest('hex');
      const userWithSession = { ...mockRawUser, refreshTokenHash: tokenHash };

      mockJwtService.extractRefreshToken.mockReturnValue(validRefreshToken);
      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-uuid-1',
      });
      mockUsersService.findRawById.mockResolvedValue(userWithSession);

      mockJwtService.signAccessToken.mockReturnValue('new_access_token');
      mockJwtService.signRefreshToken.mockReturnValue('new_refresh_token');

      const result = await service.refresh(mockRequest, mockResponse);

      expect(result).toEqual({
        accessToken: 'new_access_token',
      });

      expect(mockJwtService.extractRefreshToken).toHaveBeenCalledWith(
        mockRequest,
      );
      expect(mockJwtService.verifyRefreshToken).toHaveBeenCalledWith(
        validRefreshToken,
      );
      expect(mockUsersService.findRawById).toHaveBeenCalledWith('user-uuid-1');

      const newExpectedHash = crypto
        .createHash('sha256')
        .update('new_refresh_token')
        .digest('hex');
      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-uuid-1',
        newExpectedHash,
      );
      expect(mockJwtService.setRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
        'new_refresh_token',
      );
    });

    it('harus melempar UnauthorizedException jika refresh token tidak diekstrak', async () => {
      mockJwtService.extractRefreshToken.mockReturnValue(undefined);

      await expect(service.refresh(mockRequest, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.verifyRefreshToken).not.toHaveBeenCalled();
    });

    it('harus melempar UnauthorizedException jika hash refresh token tidak cocok dengan DB', async () => {
      const incomingRefreshToken = 'wrong_refresh_token';
      const userWithDifferentSession = {
        ...mockRawUser,
        refreshTokenHash: 'some_other_hash',
      };

      mockJwtService.extractRefreshToken.mockReturnValue(incomingRefreshToken);
      mockJwtService.verifyRefreshToken.mockReturnValue({
        userId: 'user-uuid-1',
      });
      mockUsersService.findRawById.mockResolvedValue(userWithDifferentSession);

      await expect(service.refresh(mockRequest, mockResponse)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockJwtService.signAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('harus menghapus hash refresh token di DB dan menghapus kuki via JwtService', async () => {
      await service.logout('user-uuid-1', mockResponse);

      expect(mockUsersService.updateRefreshTokenHash).toHaveBeenCalledWith(
        'user-uuid-1',
        null,
      );
      expect(mockJwtService.clearRefreshTokenCookie).toHaveBeenCalledWith(
        mockResponse,
      );
    });
  });
});
