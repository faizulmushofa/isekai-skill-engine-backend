jest.mock('@prisma/client', () => ({
  PrismaClient: class {},
  Prisma: {},
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { SkillInitService } from '../skill-init.service';
import { AiService } from '../../../infrastructure/ai/ai.service';
import { CareerGoalsService } from '../../career-goals/career-goals.service';
import { UserGoalsService } from '../../user-goals/user-goals.service';
import { SkillsService } from '../../skills/skills.service';
import { CareerGoalSkillsService } from '../../career-goal-skills/career-goal-skills.service';
import { UserSkillsService } from '../../user-skills/user-skills.service';

describe('SkillInitService (Orchestrator)', () => {
  let service: SkillInitService;

  // ── Mock AI responses ──────────────────────────────────────────────────

  const mockDirectClassification = {
    intent: 'DIRECT_GOAL',
    careerName: 'Backend Engineer',
  };

  const mockVagueClassification = {
    intent: 'VAGUE_GOAL',
    careerName: undefined,
  };

  const mockEmptyClassification = {
    intent: 'EMPTY',
    careerName: undefined,
  };

  const mockAdaptiveQuestion = {
    question: 'Apa yang kamu sukai dari coding?',
    dimension: 'INVESTIGATIVE',
    isDiscoveryComplete: false,
    discoveredTraits: undefined,
  };

  const mockDiscoveryComplete = {
    question: 'Pertanyaan terakhir?',
    dimension: 'REALISTIC',
    isDiscoveryComplete: true,
    discoveredTraits: ['analytical', 'systematic', 'technical'],
  };

  const mockCareerOptions = {
    careerGoals: [
      { title: 'Backend Engineer', confidence: 0.9, matchFactors: ['systematic'], reason: 'Great fit' },
      { title: 'DevOps Engineer', confidence: 0.75, matchFactors: ['technical'], reason: 'Also good' },
    ],
  };

  const mockSkillsResult = {
    skills: [
      { name: 'REST API Design', description: 'API fundamentals', whyImportant: 'Core skill' },
      { name: 'Database Design', description: 'DB fundamentals', whyImportant: 'Essential' },
    ],
  };

  // ── Mock services ──────────────────────────────────────────────────────

  const mockAiService = { generate: jest.fn() };
  const mockCareerGoalsService = { findOrCreate: jest.fn() };
  const mockUserGoalsService = { create: jest.fn() };
  const mockSkillsService = { findOrCreateMany: jest.fn() };
  const mockCareerGoalSkillsService = { linkSkills: jest.fn() };
  const mockUserSkillsService = { initializeProgress: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillInitService,
        { provide: AiService, useValue: mockAiService },
        { provide: CareerGoalsService, useValue: mockCareerGoalsService },
        { provide: UserGoalsService, useValue: mockUserGoalsService },
        { provide: SkillsService, useValue: mockSkillsService },
        { provide: CareerGoalSkillsService, useValue: mockCareerGoalSkillsService },
        { provide: UserSkillsService, useValue: mockUserSkillsService },
      ],
    }).compile();

    service = module.get<SkillInitService>(SkillInitService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── start() ────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('DIRECT_GOAL: harus langsung ke CAREER_SELECTION jika karier spesifik dideteksi', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockDirectClassification)
        .mockResolvedValueOnce(mockCareerOptions);

      const result = await service.start('user-1', 'saya ingin jadi backend engineer');

      expect(result.step).toBe('CAREER_SELECTION');
      expect(result.intent).toBe('DIRECT_GOAL');
      expect(result.careerOptions).toHaveLength(2);
      expect(result.question).toBeUndefined();
    });

    it('VAGUE_GOAL: harus mulai discovery quiz jika niat tidak jelas', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);

      const result = await service.start('user-1', 'saya suka coding');

      expect(result.step).toBe('DISCOVERY');
      expect(result.intent).toBe('VAGUE_GOAL');
      expect(result.question).toBeDefined();
      expect(result.careerOptions).toBeUndefined();
    });

    it('EMPTY: harus mulai discovery quiz jika tidak ada input karier', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockEmptyClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);

      const result = await service.start('user-1', '');

      expect(result.step).toBe('DISCOVERY');
      expect(result.intent).toBe('EMPTY');
      expect(result.question).toBeDefined();
    });

    it('harus melempar ConflictException jika sesi sudah aktif', async () => {
      // Setup: buat sesi pertama
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);
      await service.start('user-1', 'saya suka coding');

      // Coba start lagi
      await expect(service.start('user-1', 'input kedua')).rejects.toThrow(
        ConflictException,
      );
    });

    it('harus mengisolasi sesi per userId (user berbeda tidak saling mengganggu)', async () => {
      mockAiService.generate
        .mockResolvedValue(mockVagueClassification)
        .mockResolvedValue(mockAdaptiveQuestion);

      // Dua user berbeda bisa start bersamaan
      await expect(service.start('user-A', 'input')).resolves.toBeDefined();
      await expect(service.start('user-B', 'input')).resolves.toBeDefined();
    });
  });

  // ── answer() ───────────────────────────────────────────────────────────

  describe('answer()', () => {
    beforeEach(async () => {
      // Setup sesi dalam DISCOVERY mode
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);
      await service.start('user-1', 'saya suka coding');
      jest.clearAllMocks();
    });

    it('harus mengembalikan pertanyaan berikutnya jika discovery belum selesai', async () => {
      mockAiService.generate.mockResolvedValueOnce(mockAdaptiveQuestion);

      const result = await service.answer('user-1', 'saya suka memecahkan masalah');

      expect(result.step).toBe('DISCOVERY');
      expect(result.question).toBe('Apa yang kamu sukai dari coding?');
    });

    it('harus pindah ke CAREER_SELECTION ketika discovery selesai', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockDiscoveryComplete)
        .mockResolvedValueOnce(mockCareerOptions);

      const result = await service.answer('user-1', 'jawaban terakhir');

      expect(result.step).toBe('CAREER_SELECTION');
      expect(result.careerOptions).toHaveLength(2);
      expect(result.question).toBeUndefined();
    });

    it('harus melempar BadRequestException jika tidak ada sesi aktif', async () => {
      await expect(service.answer('user-tanpa-sesi', 'jawaban')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('harus melempar BadRequestException jika sesi tidak dalam step DISCOVERY', async () => {
      // Paksa sesi ke step CAREER_SELECTION
      mockAiService.generate
        .mockResolvedValueOnce(mockDiscoveryComplete)
        .mockResolvedValueOnce(mockCareerOptions);
      await service.answer('user-1', 'trigger career selection');
      jest.clearAllMocks();

      // Coba answer lagi — harusnya gagal
      await expect(service.answer('user-1', 'jawaban salah step')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── selectCareer() ─────────────────────────────────────────────────────

  describe('selectCareer()', () => {
    beforeEach(async () => {
      // Setup sesi sampai ke CAREER_SELECTION
      mockAiService.generate
        .mockResolvedValueOnce(mockDirectClassification)
        .mockResolvedValueOnce(mockCareerOptions);
      await service.start('user-1', 'backend engineer');
      jest.clearAllMocks();
    });

    it('harus menyelesaikan flow dan memanggil semua domain services secara berurutan', async () => {
      mockAiService.generate.mockResolvedValueOnce(mockSkillsResult);
      mockCareerGoalsService.findOrCreate.mockResolvedValue('career-goal-id');
      mockUserGoalsService.create.mockResolvedValue(undefined);
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-id-1', 'skill-id-2']);
      mockCareerGoalSkillsService.linkSkills.mockResolvedValue(undefined);
      mockUserSkillsService.initializeProgress.mockResolvedValue(undefined);

      const result = await service.selectCareer('user-1', 'Backend Engineer');

      expect(result.step).toBe('DONE');
      expect(result.initializedSkills).toHaveLength(2);

      // Verifikasi urutan orchestration calls
      expect(mockCareerGoalsService.findOrCreate).toHaveBeenCalledWith('Backend Engineer');
      expect(mockUserGoalsService.create).toHaveBeenCalledWith('user-1', 'career-goal-id');
      expect(mockSkillsService.findOrCreateMany).toHaveBeenCalledWith([
        { name: 'REST API Design', description: 'API fundamentals' },
        { name: 'Database Design', description: 'DB fundamentals' },
      ]);
      expect(mockCareerGoalSkillsService.linkSkills).toHaveBeenCalledWith(
        'career-goal-id',
        ['skill-id-1', 'skill-id-2'],
      );
      expect(mockUserSkillsService.initializeProgress).toHaveBeenCalledWith(
        'user-1',
        ['skill-id-1', 'skill-id-2'],
      );
    });

    it('harus menghapus sesi setelah selesai (step DONE)', async () => {
      mockAiService.generate.mockResolvedValueOnce(mockSkillsResult);
      mockCareerGoalsService.findOrCreate.mockResolvedValue('career-goal-id');
      mockUserGoalsService.create.mockResolvedValue(undefined);
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-id-1']);
      mockCareerGoalSkillsService.linkSkills.mockResolvedValue(undefined);
      mockUserSkillsService.initializeProgress.mockResolvedValue(undefined);

      await service.selectCareer('user-1', 'Backend Engineer');

      // Sesi harus terhapus — status harus null
      expect(service.getSessionStatus('user-1')).toBeNull();
    });

    it('harus melempar BadRequestException jika karier tidak ada dalam opsi', async () => {
      await expect(
        service.selectCareer('user-1', 'Karier Tidak Ada'),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus melempar BadRequestException jika sesi tidak dalam step CAREER_SELECTION', async () => {
      await expect(
        service.selectCareer('user-tanpa-sesi', 'Backend Engineer'),
      ).rejects.toThrow(BadRequestException);
    });

    it('harus case-insensitive saat validasi pilihan karier', async () => {
      mockAiService.generate.mockResolvedValueOnce(mockSkillsResult);
      mockCareerGoalsService.findOrCreate.mockResolvedValue('career-goal-id');
      mockUserGoalsService.create.mockResolvedValue(undefined);
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-id-1']);
      mockCareerGoalSkillsService.linkSkills.mockResolvedValue(undefined);
      mockUserSkillsService.initializeProgress.mockResolvedValue(undefined);

      // "backend engineer" (lowercase) harus cocok dengan "Backend Engineer"
      await expect(
        service.selectCareer('user-1', 'backend engineer'),
      ).resolves.toBeDefined();
    });
  });

  // ── getSessionStatus() ─────────────────────────────────────────────────

  describe('getSessionStatus()', () => {
    it('harus mengembalikan null jika tidak ada sesi aktif', () => {
      expect(service.getSessionStatus('user-tanpa-sesi')).toBeNull();
    });

    it('harus mengembalikan step sesi yang sedang aktif', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);
      await service.start('user-1', 'saya suka coding');

      expect(service.getSessionStatus('user-1')).toBe('DISCOVERY');
    });
  });

  // ── resetSession() ─────────────────────────────────────────────────────

  describe('resetSession()', () => {
    it('harus menghapus sesi aktif', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);
      await service.start('user-1', 'saya suka coding');

      service.resetSession('user-1');

      expect(service.getSessionStatus('user-1')).toBeNull();
    });

    it('tidak boleh throw jika tidak ada sesi yang direset', () => {
      expect(() => service.resetSession('user-tidak-ada')).not.toThrow();
    });

    it('setelah reset, user bisa memulai sesi baru', async () => {
      mockAiService.generate
        .mockResolvedValueOnce(mockVagueClassification)
        .mockResolvedValueOnce(mockAdaptiveQuestion);
      await service.start('user-1', 'saya suka coding');

      service.resetSession('user-1');

      // Mulai sesi baru
      mockAiService.generate
        .mockResolvedValueOnce(mockDirectClassification)
        .mockResolvedValueOnce(mockCareerOptions);
      await expect(
        service.start('user-1', 'backend engineer'),
      ).resolves.toBeDefined();
    });
  });

  // ── Arsitektur: Pure Orchestrator Constraint ───────────────────────────

  describe('Constraint: Pure Orchestrator (No Direct Prisma)', () => {
    it('SkillInitService tidak boleh menginjek PrismaService secara langsung', () => {
      // Verifikasi bahwa instance service tidak memiliki property prisma
      // (PrismaService TIDAK boleh diinjeksi langsung di orchestrator)
      const serviceInstance = service as any;
      expect(serviceInstance.prisma).toBeUndefined();
    });

    it('harus memiliki semua 5 domain service sebagai dependency', () => {
      const serviceInstance = service as any;
      expect(serviceInstance.careerGoalsService).toBeDefined();
      expect(serviceInstance.userGoalsService).toBeDefined();
      expect(serviceInstance.skillsService).toBeDefined();
      expect(serviceInstance.careerGoalSkillsService).toBeDefined();
      expect(serviceInstance.userSkillsService).toBeDefined();
    });
  });
});
