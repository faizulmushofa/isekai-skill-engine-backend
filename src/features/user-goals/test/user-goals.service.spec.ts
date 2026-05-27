jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UserGoalsService } from '../user-goals.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('UserGoalsService', () => {
  let service: UserGoalsService;

  const mockPrisma = {
    userGoal: {
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGoalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserGoalsService>(UserGoalsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('harus membuat relasi UserGoal antara user dan careerGoal', async () => {
      mockPrisma.userGoal.upsert.mockResolvedValue(undefined);

      await service.create('user-id-1', 'career-id-1');

      expect(mockPrisma.userGoal.upsert).toHaveBeenCalledWith({
        where: {
          userId_careerGoalId: {
            userId: 'user-id-1',
            careerGoalId: 'career-id-1',
          },
        },
        update: {},
        create: { userId: 'user-id-1', careerGoalId: 'career-id-1' },
      });
    });

    it('harus idempotent — tidak throw jika relasi sudah ada', async () => {
      mockPrisma.userGoal.upsert.mockResolvedValue(undefined);

      // Panggil 2 kali dengan data sama
      await service.create('user-id-1', 'career-id-1');
      await service.create('user-id-1', 'career-id-1');

      expect(mockPrisma.userGoal.upsert).toHaveBeenCalledTimes(2);
    });

    it('harus mengembalikan void (tidak ada return value)', async () => {
      mockPrisma.userGoal.upsert.mockResolvedValue(undefined);

      const result = await service.create('user-id-1', 'career-id-1');

      expect(result).toBeUndefined();
    });
  });
});
