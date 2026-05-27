jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { SkillsService, SkillInput } from '../skills.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SkillTaxonomyService } from '../services/skill-taxonomy.service';

describe('SkillsService', () => {
  let service: SkillsService;

  const mockPrisma = {
    skill: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockTaxonomyService = {
    resolveParentId: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: SkillTaxonomyService, useValue: mockTaxonomyService },
      ],
    }).compile();

    service = module.get<SkillsService>(SkillsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrCreateMany', () => {
    const skills: SkillInput[] = [
      { name: 'REST API Design', description: 'Designing RESTful APIs' },
      { name: 'Database Design', description: 'Relational DB fundamentals' },
    ];

    it('harus membuat skill baru jika belum ada di database', async () => {
      mockPrisma.skill.findFirst.mockResolvedValue(null);
      mockPrisma.skill.create
        .mockResolvedValueOnce({ id: 'skill-id-1' })
        .mockResolvedValueOnce({ id: 'skill-id-2' });

      const result = await service.findOrCreateMany(skills);

      expect(result).toEqual(['skill-id-1', 'skill-id-2']);
      expect(mockPrisma.skill.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.skill.create).toHaveBeenCalledWith({
        data: {
          name: 'REST API Design',
          description: 'Designing RESTful APIs',
          parentId: null,
        },
        select: { id: true },
      });
    });

    it('harus mengembalikan ID skill yang sudah ada tanpa membuat duplikat', async () => {
      mockPrisma.skill.findFirst.mockResolvedValue({ id: 'existing-skill-id' });

      const result = await service.findOrCreateMany([skills[0]]);

      expect(result).toEqual(['existing-skill-id']);
      expect(mockPrisma.skill.create).not.toHaveBeenCalled();
    });

    it('harus mix find dan create jika sebagian skill sudah ada', async () => {
      mockPrisma.skill.findFirst
        .mockResolvedValueOnce({ id: 'existing-id' }) // Skill 1 sudah ada
        .mockResolvedValueOnce(null); // Skill 2 belum ada
      mockPrisma.skill.create.mockResolvedValueOnce({ id: 'new-id' });

      const result = await service.findOrCreateMany(skills);

      expect(result).toEqual(['existing-id', 'new-id']);
      expect(mockPrisma.skill.create).toHaveBeenCalledTimes(1);
    });

    it('harus mengembalikan array kosong jika input kosong', async () => {
      const result = await service.findOrCreateMany([]);
      expect(result).toEqual([]);
      expect(mockPrisma.skill.findFirst).not.toHaveBeenCalled();
    });

    it('harus menjaga urutan ID sesuai urutan input', async () => {
      mockPrisma.skill.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.skill.create
        .mockResolvedValueOnce({ id: 'id-for-skill-1' })
        .mockResolvedValueOnce({ id: 'id-for-skill-2' });

      const result = await service.findOrCreateMany(skills);

      expect(result[0]).toBe('id-for-skill-1');
      expect(result[1]).toBe('id-for-skill-2');
    });
  });
});
