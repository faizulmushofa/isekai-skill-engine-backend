jest.mock('../../../../generated/prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { UserResponse } from '../mapper/user.mapper';
import { UnauthorizedException } from '@nestjs/common';

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
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
      const mockReq = { user: { id: 'user-uuid-1' } };
      mockUsersService.findById.mockResolvedValue(expectedResponse);

      const result = await controller.getMe(mockReq);

      expect(result).toEqual(expectedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('harus berhasil mengembalikan profil pengguna menggunakan sub/userId jika id kosong di request', async () => {
      const mockReq = { user: { userId: 'user-uuid-1' } };
      mockUsersService.findById.mockResolvedValue(expectedResponse);

      const result = await controller.getMe(mockReq);

      expect(result).toEqual(expectedResponse);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('harus melempar UnauthorizedException jika request context tidak memiliki data user', async () => {
      const mockReq = {};

      await expect(controller.getMe(mockReq)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockUsersService.findById).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('harus berhasil mengembalikan profil pengguna berdasarkan ID dari service', async () => {
      mockUsersService.findById.mockResolvedValue(expectedResponse);

      const result = await controller.getById('user-uuid-1');

      expect(result).toEqual(expectedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('update', () => {
    it('harus memanggil service.updateUser dan mengembalikan profil pengguna yang diperbarui', async () => {
      const payload = { username: 'newname' };
      const expectedUpdatedResponse = { ...expectedResponse, username: 'newname' };

      mockUsersService.updateUser.mockResolvedValue(expectedUpdatedResponse);

      const result = await controller.update('user-uuid-1', payload);

      expect(result).toEqual(expectedUpdatedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-uuid-1', payload);
    });
  });
});
