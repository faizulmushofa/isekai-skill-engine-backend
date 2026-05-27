jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { CareerGoalSkillsService } from '../career-goal-skills.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('CareerGoalSkillsService', () => {
  let service: CareerGoalSkillsService;

  const mockPrisma = {
    careerGoalSkill: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareerGoalSkillsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CareerGoalSkillsService>(CareerGoalSkillsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('linkSkills', () => {
    it('harus menghubungkan semua skillId dengan careerGoalId yang diberikan', async () => {
      mockPrisma.careerGoalSkill.createMany.mockResolvedValue({ count: 3 });

      await service.linkSkills('career-id-1', ['skill-1', 'skill-2', 'skill-3']);

      expect(mockPrisma.careerGoalSkill.createMany).toHaveBeenCalledWith({
        data: [
          { careerGoalId: 'career-id-1', skillId: 'skill-1' },
          { careerGoalId: 'career-id-1', skillId: 'skill-2' },
          { careerGoalId: 'career-id-1', skillId: 'skill-3' },
        ],
        skipDuplicates: true,
      });
    });

    it('harus menggunakan skipDuplicates untuk idempotency', async () => {
      mockPrisma.careerGoalSkill.createMany.mockResolvedValue({ count: 0 });

      await service.linkSkills('career-id-1', ['skill-1']);

      expect(mockPrisma.careerGoalSkill.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('harus berhasil dengan array skillIds kosong', async () => {
      mockPrisma.careerGoalSkill.createMany.mockResolvedValue({ count: 0 });

      await expect(service.linkSkills('career-id-1', [])).resolves.not.toThrow();

      expect(mockPrisma.careerGoalSkill.createMany).toHaveBeenCalledWith({
        data: [],
        skipDuplicates: true,
      });
    });
  });
});
