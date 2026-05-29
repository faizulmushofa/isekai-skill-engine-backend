import { Test, TestingModule } from '@nestjs/testing';
import { SkillAggregatorService } from '../skill-aggregator.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

describe('SkillAggregatorService (Read Model Layer)', () => {
  let service: SkillAggregatorService;
  let prisma: PrismaService;

  const mockSkills = [
    { id: '1', name: 'Software Engineering', parentId: null },
    { id: '2', name: 'Backend Security', parentId: '1' },
    { id: '3', name: 'OAuth 2.0', parentId: '2' },
  ];

  const mockUserSkills = [
    { id: 'us-1', userId: 'user-uuid', skillId: '1', progress: 50.0 },
    { id: 'us-2', userId: 'user-uuid', skillId: '2', progress: 30.0 },
  ];

  const mockPrisma = {
    skill: {
      findMany: jest.fn().mockResolvedValue(mockSkills),
    },
    userSkill: {
      findMany: jest.fn().mockResolvedValue(mockUserSkills),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillAggregatorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<SkillAggregatorService>(SkillAggregatorService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSkillGraph', () => {
    it('should correctly format nodes and edge connections', async () => {
      const graph = await service.getSkillGraph('user-uuid');

      expect(graph.nodes).toHaveLength(3);
      expect(graph.nodes[0]).toEqual({ id: '1', name: 'Software Engineering', progress: 50.0 });
      expect(graph.nodes[2]).toEqual({ id: '3', name: 'OAuth 2.0', progress: 0.0 }); // Unstarted skill

      expect(graph.edges).toHaveLength(2);
      expect(graph.edges[0]).toEqual({ source: '1', target: '2' });
      expect(graph.edges[1]).toEqual({ source: '2', target: '3' });
    });
  });

  describe('getSkillTree', () => {
    it('should compile a nested tree structure chronologically from parent to children', async () => {
      const tree = await service.getSkillTree('user-uuid');

      expect(tree).toHaveLength(1); // Only 1 root node: Software Engineering
      expect(tree[0].id).toBe('1');
      expect(tree[0].progress).toBe(50.0);
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].id).toBe('2');
      expect(tree[0].children[0].progress).toBe(30.0);
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].id).toBe('3');
      expect(tree[0].children[0].children[0].progress).toBe(0.0);
    });
  });

  describe('getSkillProgress', () => {
    it('should compile flat progress mappings', async () => {
      const list = await service.getSkillProgress('user-uuid');

      expect(list).toHaveLength(3);
      expect(list[0]).toEqual({ skillId: '1', name: 'Software Engineering', progress: 50.0 });
      expect(list[2]).toEqual({ skillId: '3', name: 'OAuth 2.0', progress: 0.0 });
    });
  });
});
