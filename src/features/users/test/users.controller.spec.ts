jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { UserResponse } from '../mapper/user.mapper';
import { ForbiddenException } from '@nestjs/common';
import { JwtService } from '../../../infrastructure/jwt/jwt.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const expectedResponse: UserResponse = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    createdAt: new Date(),
  };

  const mockUsersService = {
    findById: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockJwtService = {
    verifyAccessToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('harus berhasil mengembalikan profil pengguna saat ini dari service', async () => {
      mockUsersService.findById.mockResolvedValue(expectedResponse);

      // @CurrentUser() sudah meng-resolve userId sebelum masuk handler
      const result = await controller.getMe('user-uuid-1');

      expect(result).toEqual(expectedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('getById', () => {
    it('harus berhasil mengembalikan profil pengguna jika ID cocok dengan userId yang terautentikasi', async () => {
      mockUsersService.findById.mockResolvedValue(expectedResponse);

      const result = await controller.getById('user-uuid-1', 'user-uuid-1');

      expect(result).toEqual(expectedResponse);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('harus melempar ForbiddenException jika mencoba melihat profil pengguna lain', async () => {
      await expect(
        controller.getById('user-uuid-1', 'user-uuid-other'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.findById).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('harus memanggil service.updateUser jika ID cocok dengan userId yang terautentikasi', async () => {
      const payload = { username: 'newname' };
      const expectedUpdatedResponse = {
        ...expectedResponse,
        username: 'newname',
      };

      mockUsersService.updateUser.mockResolvedValue(expectedUpdatedResponse);

      const result = await controller.update(
        'user-uuid-1',
        payload,
        'user-uuid-1',
      );

      expect(result).toEqual(expectedUpdatedResponse);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user-uuid-1',
        payload,
      );
    });

    it('harus melempar ForbiddenException jika mencoba mengubah profil pengguna lain', async () => {
      const payload = { username: 'newname' };

      await expect(
        controller.update('user-uuid-1', payload, 'user-uuid-other'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsersService.updateUser).not.toHaveBeenCalled();
    });
  });
});
