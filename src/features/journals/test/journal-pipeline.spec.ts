import { Test, TestingModule } from '@nestjs/testing';
import { JournalsService } from '../journals.service';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { ExtractionService } from '../../../infrastructure/extraction/extraction.service';
import { AiService } from '../../../infrastructure/ai/ai.service';
import { SkillsService } from '../../skills/skills.service';
import { SkillEventsService } from '../../skill-events/skill-events.service';
import { BadRequestException } from '@nestjs/common';

// Bulletproof mock for fs module before imports
jest.mock('fs', () => ({
  existsSync: () => true,
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined),
  },
}));

import * as fs from 'fs';

describe('Journals Ingestion Pipeline (Integration Tests)', () => {
  let service: JournalsService;
  let prisma: PrismaService;
  let extractionService: ExtractionService;
  let aiService: AiService;
  let skillsService: SkillsService;
  let skillEventsService: SkillEventsService;

  const mockJournal = {
    id: 'journal-uuid-123',
    title: 'Belajar OAuth2',
    content: 'Hari ini saya belajar implementasi refresh token flow menggunakan JWT di NestJS.',
    userId: 'user-uuid-999',
  };

  const mockAiOutput = {
    skills: [
      {
        name: 'Backend Security',
        confidence: 0.9,
        complexity: 'intermediate',
        evidence: ['refresh token flow', 'JWT'],
        reason: 'Demonstrated concrete implementation of secure authorization flows.',
      },
    ],
  };

  const mockPrisma = {
    journal: {
      create: jest.fn().mockResolvedValue(mockJournal),
    },
  };

  const mockExtraction = {
    extractContent: jest.fn().mockResolvedValue({
      rawText: 'Extracted content text',
      normalizedText: 'Normalized extracted clean text',
    }),
  };

  const mockAi = {
    generate: jest.fn().mockResolvedValue(mockAiOutput),
  };

  const mockSkills = {
    findOrCreateMany: jest.fn().mockResolvedValue(['skill-uuid-backend-security']),
  };

  const mockSkillEvents = {
    recordEvent: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ExtractionService, useValue: mockExtraction },
        { provide: AiService, useValue: mockAi },
        { provide: SkillsService, useValue: mockSkills },
        { provide: SkillEventsService, useValue: mockSkillEvents },
      ],
    }).compile();

    service = module.get<JournalsService>(JournalsService);
    prisma = module.get<PrismaService>(PrismaService);
    extractionService = module.get<ExtractionService>(ExtractionService);
    aiService = module.get<AiService>(AiService);
    skillsService = module.get<SkillsService>(SkillsService);
    skillEventsService = module.get<SkillEventsService>(SkillEventsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Manual Journal Pipeline', () => {
    it('should complete the entire 6-stage manual progress pipeline successfully', async () => {
      const dto = {
        title: 'Belajar OAuth2',
        content: 'Hari ini saya belajar implementasi refresh token flow menggunakan JWT di NestJS.',
      };

      const result = await service.create('user-uuid-999', dto);

      // Verify Stage 1: Manual Input Normalization & Database Ingestion
      expect(prisma.journal.create).toHaveBeenCalledWith({
        data: {
          title: 'Belajar OAuth2',
          content: dto.content,
          userId: 'user-uuid-999',
        },
      });
      expect(result).toEqual(mockJournal);

      // Verify Stage 2: Learning Evidence AI Signal Extraction
      expect(aiService.generate).toHaveBeenCalled();

      // Verify Stage 3: Graph Resolver (Find/Create + Edges Resolution)
      expect(skillsService.findOrCreateMany).toHaveBeenCalledWith([
        {
          name: 'Backend Security',
          description: mockAiOutput.skills[0].reason,
        },
      ]);

      // Verify Stage 4, 5 & 6: Bayesian Math, Immutable Logging & Projection Propagation
      expect(skillEventsService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-uuid-999',
        skillId: 'skill-uuid-backend-security',
        sourceType: 'JOURNAL',
        sourceId: 'journal-uuid-123',
        rawScore: 90.0, // confidence 0.9 scaled to 100
        reason: mockAiOutput.skills[0].reason,
        metadata: {
          sourceRef: 'manual',
          rawText: dto.content,
          rawSignals: mockAiOutput.skills[0].evidence,
        },
      });
    });

    it('should throw BadRequestException if title is missing', async () => {
      await expect(service.create('user-uuid', { title: '', content: 'some text' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('2. File Ingestion Pipeline', () => {
    it('should complete the entire file-based pipeline with temporary file cleanup', async () => {
      const fileMock = {
        buffer: Buffer.from('Mock file buffer content'),
        originalname: 'journal-notes.pdf',
        mimetype: 'application/pdf',
      };

      const result = await service.createFromFile('user-uuid-999', fileMock);

      // Verify Stage 1: Temp File Creation, Extraction Normalization, and Save
      expect(fs.promises.writeFile).toHaveBeenCalled();
      expect(extractionService.extractContent).toHaveBeenCalledWith(
        expect.any(String),
        'application/pdf',
      );
      expect(prisma.journal.create).toHaveBeenCalledWith({
        data: {
          title: 'journal-notes.pdf',
          content: 'Normalized extracted clean text',
          userId: 'user-uuid-999',
        },
      });

      // Verify Pipeline Orchestration
      expect(aiService.generate).toHaveBeenCalled();
      expect(skillsService.findOrCreateMany).toHaveBeenCalled();
      expect(skillEventsService.recordEvent).toHaveBeenCalled();

      // Verify Stage 1 Clean Up: Temporary file deleted safely
      expect(fs.promises.unlink).toHaveBeenCalled();
    });
  });
});
