import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from '../projects.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    project: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockProject = {
    id: 'project-uuid-1',
    userId: 'user-uuid-1',
    title: 'Isekai Skill Engine Backend',
    description: 'A premium skill aggregation backend.',
    repositoryUrl: 'https://github.com/hero/isekai-backend',
    reportContent: 'Successfully compiled NestJS project with Prisma.',
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully save a project with correct fields', async () => {
      mockPrismaService.project.create.mockResolvedValue(mockProject);

      const dto = {
        title: 'Isekai Skill Engine Backend',
        description: 'A premium skill aggregation backend.',
        repositoryUrl: 'https://github.com/hero/isekai-backend',
        reportContent: 'Successfully compiled NestJS project with Prisma.',
      };
      const result = await service.create('user-uuid-1', dto);

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.create).toHaveBeenCalledWith({
        data: {
          title: 'Isekai Skill Engine Backend',
          description: 'A premium skill aggregation backend.',
          repositoryUrl: 'https://github.com/hero/isekai-backend',
          reportContent: 'Successfully compiled NestJS project with Prisma.',
          userId: 'user-uuid-1',
        },
      });
    });

    it('should throw BadRequestException if title is empty', async () => {
      const dto = { title: '   ', description: 'Some description' };
      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.project.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all projects belonging to the user ordered by createdAt desc', async () => {
      mockPrismaService.project.findMany.mockResolvedValue([mockProject]);

      const result = await service.findAll('user-uuid-1');

      expect(result).toEqual([mockProject]);
      expect(mockPrismaService.project.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the project if it exists and belongs to the current user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject);

      const result = await service.findOne('user-uuid-1', 'project-uuid-1');

      expect(result).toEqual(mockProject);
      expect(mockPrismaService.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-uuid-1' },
      });
    });

    it('should throw NotFoundException if project belongs to another user', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(mockProject); // belongs to user-uuid-1

      await expect(service.findOne('another-user-id', 'project-uuid-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockPrismaService.project.findUnique.mockResolvedValue(null);

      await expect(service.findOne('user-uuid-1', 'nonexistent-uuid')).rejects.toThrow(NotFoundException);
    });
  });
});
