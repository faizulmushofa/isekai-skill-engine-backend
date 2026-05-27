jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CareerGoalsService } from '../career-goals.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('CareerGoalsService', () => {
  let service: CareerGoalsService;

  const mockPrisma = {
    careerGoal: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerGoalsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CareerGoalsService>(CareerGoalsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreate', () => {
    it('harus mengembalikan ID yang sudah ada jika karier sudah terdaftar', async () => {
      mockPrisma.careerGoal.findFirst.mockResolvedValue({
        id: 'existing-career-id',
      });

      const result = await service.findOrCreate('Backend Engineer');

      expect(result).toBe('existing-career-id');
      expect(mockPrisma.careerGoal.create).not.toHaveBeenCalled();
    });

    it('harus membuat karier baru jika belum terdaftar dan mengembalikan ID-nya', async () => {
      mockPrisma.careerGoal.findFirst.mockResolvedValue(null);
      mockPrisma.careerGoal.create.mockResolvedValue({ id: 'new-career-id' });

      const result = await service.findOrCreate('Data Scientist');

      expect(result).toBe('new-career-id');
      expect(mockPrisma.careerGoal.create).toHaveBeenCalledWith({
        data: { name: 'Data Scientist' },
        select: { id: true },
      });
    });

    it('harus mencari berdasarkan nama yang diberikan', async () => {
      mockPrisma.careerGoal.findFirst.mockResolvedValue({ id: 'career-id' });

      await service.findOrCreate('DevOps Engineer');

      expect(mockPrisma.careerGoal.findFirst).toHaveBeenCalledWith({
        where: { name: 'DevOps Engineer' },
        select: { id: true },
      });
    });
  });
});
