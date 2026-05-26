import { Test, TestingModule } from '@nestjs/testing';
import { JournalsService } from '../journals.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('JournalsService', () => {
  let service: JournalsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    journal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const mockJournal = {
    id: 'journal-uuid-1',
    userId: 'user-uuid-1',
    title: 'My First Journey',
    content: 'Today I woke up in another world...',
    createdAt: new Date(),
    updatedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<JournalsService>(JournalsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully save a journal with correct fields', async () => {
      mockPrismaService.journal.create.mockResolvedValue(mockJournal);

      const dto = {
        title: 'My First Journey',
        content: 'Today I woke up in another world...',
      };
      const result = await service.create('user-uuid-1', dto);

      expect(result).toEqual(mockJournal);
      expect(mockPrismaService.journal.create).toHaveBeenCalledWith({
        data: {
          title: 'My First Journey',
          content: 'Today I woke up in another world...',
          userId: 'user-uuid-1',
        },
      });
    });

    it('should throw BadRequestException if title is empty', async () => {
      const dto = { title: '', content: 'Valid content' };
      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.journal.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if content is empty', async () => {
      const dto = { title: 'Valid Title', content: '   ' };
      await expect(service.create('user-uuid-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.journal.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all journals belonging to the user ordered by createdAt desc', async () => {
      mockPrismaService.journal.findMany.mockResolvedValue([mockJournal]);

      const result = await service.findAll('user-uuid-1');

      expect(result).toEqual([mockJournal]);
      expect(mockPrismaService.journal.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-uuid-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should return the journal if it exists and belongs to the current user', async () => {
      mockPrismaService.journal.findUnique.mockResolvedValue(mockJournal);

      const result = await service.findOne('user-uuid-1', 'journal-uuid-1');

      expect(result).toEqual(mockJournal);
      expect(mockPrismaService.journal.findUnique).toHaveBeenCalledWith({
        where: { id: 'journal-uuid-1' },
      });
    });

    it('should throw NotFoundException if journal belongs to another user', async () => {
      mockPrismaService.journal.findUnique.mockResolvedValue(mockJournal); // belongs to user-uuid-1

      await expect(
        service.findOne('another-user-id', 'journal-uuid-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if journal does not exist', async () => {
      mockPrismaService.journal.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('user-uuid-1', 'nonexistent-uuid'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
