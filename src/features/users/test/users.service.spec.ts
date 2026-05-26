jest.mock('../../../../generated/prisma/client', () => {
  return {
    PrismaClient: class {},
    Prisma: {},
  };
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../users.service';
import { UsersRepository } from '../users.repository';
import { UserResponse } from '../mapper/user.mapper';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { User } from '../../../../generated/prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let repository: UsersRepository;

  const mockUser: User = {
    id: 'user-uuid-1',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hashed_password_123',
    createdAt: new Date(),
    updatedAt: null,
  } as any;

  const expectedResponse: UserResponse = {
    id: mockUser.id,
    email: mockUser.email,
    username: mockUser.username,
    createdAt: mockUser.createdAt,
  };

  const mockUsersRepository = {
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByUsername: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<UsersRepository>(UsersRepository);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('harus mengembalikan UserResponse jika ID ditemukan', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-uuid-1');

      expect(result).toEqual(expectedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersRepository.findById).toHaveBeenCalledWith('user-uuid-1');
    });

    it('harus melempar NotFoundException jika ID tidak ditemukan', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByEmail', () => {
    it('harus mengembalikan UserResponse jika Email ditemukan', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(result).toEqual(expectedResponse);
      expect(result.hasOwnProperty('passwordHash')).toBe(false);
      expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('harus melempar NotFoundException jika Email tidak ditemukan', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      await expect(service.findByEmail('unknown@example.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    it('harus melempar NotFoundException jika pengguna yang akan di-update tidak ditemukan', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateUser('non-existent-id', { username: 'newname' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('harus melempar BadRequestException jika email dicoba untuk diubah', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateUser('user-uuid-1', { email: 'different@example.com' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melempar BadRequestException jika nama pengguna baru kosong', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);

      await expect(
        service.updateUser('user-uuid-1', { username: '   ' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melempar ConflictException jika nama pengguna baru sudah digunakan oleh pengguna lain', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.findByUsername.mockResolvedValue({
        id: 'user-uuid-2',
        username: 'takenname',
      });

      await expect(
        service.updateUser('user-uuid-1', { username: 'takenname' }),
      ).rejects.toThrow(ConflictException);
    });

    it('tidak boleh melempar ConflictException jika nama pengguna baru di-update dengan nilai yang sama', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.update.mockResolvedValue(mockUser);

      const result = await service.updateUser('user-uuid-1', {
        username: 'testuser',
      });

      expect(result).toEqual(expectedResponse);
      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-uuid-1', {
        username: 'testuser',
      });
      expect(mockUsersRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('harus berhasil meng-update nama pengguna jika semua aturan validasi terpenuhi', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      mockUsersRepository.findByUsername.mockResolvedValue(null);
      
      const updatedUser = { ...mockUser, username: 'newawesomeusername' };
      const expectedUpdatedResponse = { ...expectedResponse, username: 'newawesomeusername' };
      mockUsersRepository.update.mockResolvedValue(updatedUser);

      const result = await service.updateUser('user-uuid-1', {
        username: 'newawesomeusername',
      });

      expect(result).toEqual(expectedUpdatedResponse);
      expect(mockUsersRepository.update).toHaveBeenCalledWith('user-uuid-1', {
        username: 'newawesomeusername',
      });
    });
  });
});
