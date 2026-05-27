jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { UserSkillsService } from '../user-skills.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('UserSkillsService', () => {
  let service: UserSkillsService;

  const mockPrisma = {
    userSkill: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSkillsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UserSkillsService>(UserSkillsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('initializeProgress', () => {
    it('harus membuat UserSkill untuk setiap skillId dengan progress = 0', async () => {
      mockPrisma.userSkill.createMany.mockResolvedValue({ count: 3 });

      await service.initializeProgress('user-id-1', [
        'skill-1',
        'skill-2',
        'skill-3',
      ]);

      expect(mockPrisma.userSkill.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'user-id-1', skillId: 'skill-1', progress: 0 },
          { userId: 'user-id-1', skillId: 'skill-2', progress: 0 },
          { userId: 'user-id-1', skillId: 'skill-3', progress: 0 },
        ],
        skipDuplicates: true,
      });
    });

    it('setiap entry harus memiliki progress awal = 0', async () => {
      mockPrisma.userSkill.createMany.mockImplementation(async (args) => {
        // Verifikasi semua progress = 0
        const allProgressZero = args.data.every(
          (entry: any) => entry.progress === 0,
        );
        expect(allProgressZero).toBe(true);
        return { count: args.data.length };
      });

      await service.initializeProgress('user-id-1', ['skill-1', 'skill-2']);
    });

    it('harus menggunakan skipDuplicates untuk mencegah duplikasi data', async () => {
      mockPrisma.userSkill.createMany.mockResolvedValue({ count: 0 });

      await service.initializeProgress('user-id-1', ['skill-1']);

      expect(mockPrisma.userSkill.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    });

    it('harus berhasil dengan array skillIds kosong', async () => {
      mockPrisma.userSkill.createMany.mockResolvedValue({ count: 0 });

      await expect(
        service.initializeProgress('user-id-1', []),
      ).resolves.not.toThrow();
    });
  });
});
