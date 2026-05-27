import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from '../quiz.service';
import { QuizRepository } from '../quiz.repository';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../../infrastructure/ai/ai.service';
import { SkillsService } from '../../skills/skills.service';
import { SkillEventsService } from '../../skill-events/skill-events.service';
import { BadRequestException } from '@nestjs/common';
import { SourceType } from '@prisma/client';

describe('Adaptive Quiz Service', () => {
  let service: QuizService;
  let prisma: PrismaService;
  let quizRepository: QuizRepository;
  let aiService: AiService;
  let skillsService: SkillsService;
  let skillEventsService: SkillEventsService;

  const mockPrismaService = {
    userSkill: {
      findUnique: jest.fn(),
    },
    skillEvent: {
      create: jest.fn(),
    },
    skill: {
      findUnique: jest.fn(),
    },
    question: {
      findMany: jest.fn(),
    },
  };

  const mockQuizRepository = {
    findQuizByTitle: jest.fn(),
    createQuiz: jest.fn(),
    createAttempt: jest.fn(),
    addQuestionsToQuiz: jest.fn(),
    saveAnswer: jest.fn(),
    findQuestion: jest.fn(),
    updateAnswerEvaluation: jest.fn(),
    updateAttemptScore: jest.fn(),
  };

  const mockAiService = {
    generate: jest.fn(),
  };

  const mockSkillsService = {
    findOrCreateMany: jest.fn(),
  };

  const mockSkillEventsService = {
    recordEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QuizRepository, useValue: mockQuizRepository },
        { provide: AiService, useValue: mockAiService },
        { provide: SkillsService, useValue: mockSkillsService },
        { provide: SkillEventsService, useValue: mockSkillEventsService },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    prisma = module.get<PrismaService>(PrismaService);
    quizRepository = module.get<QuizRepository>(QuizRepository);
    aiService = module.get<AiService>(AiService);
    skillsService = module.get<SkillsService>(SkillsService);
    skillEventsService = module.get<SkillEventsService>(SkillEventsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startQuiz', () => {
    it('should ask the user to select a mode with direct options', async () => {
      const res = await service.startQuiz('user-1', 'Backend Security');

      expect(res).toEqual({
        state: 'DECISION_REQUIRED',
        message: expect.stringContaining('1. Cerita belajar saja\n2. Diuji (7 soal adaptif)\n\nBalas: 1 atau 2'),
        data: {
          topic: 'Backend Security',
        },
      });
    });

    it('should throw BadRequestException for empty topic', async () => {
      await expect(service.startQuiz('user-1', '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('selectMode - Mode 1 (Story)', () => {
    it('should log a flat passive SkillEvent with finalContribution = 0 and return template', async () => {
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-uuid-1']);
      mockPrismaService.userSkill.findUnique.mockResolvedValue({ progress: 42.0 });
      mockPrismaService.skillEvent.create.mockResolvedValue({ id: 'event-1' });

      const res = await service.selectMode('user-1', '1', 'Backend Security');

      expect(res.state).toBe('EXIT');
      expect(res.message).toBeDefined();
      expect(mockSkillsService.findOrCreateMany).toHaveBeenCalledWith([
        {
          name: 'Backend Security',
          description: 'Cerita belajar: Backend Security',
        },
      ]);
      expect(mockPrismaService.skillEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          skillId: 'skill-uuid-1',
          sourceType: SourceType.QUIZ,
          contribution: 0.0,
          oldProgress: 42.0,
          newProgress: 42.0,
          metadata: {
            mode: 'STORY',
            finalContribution: 0,
          },
        }),
      });
    });
  });

  describe('selectMode - Mode 2 (Scoring)', () => {
    it('should initialize quiz, fetch questions from DB first, generate if < 7, and deliver Q1', async () => {
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-uuid-1']);
      mockPrismaService.skill.findUnique.mockResolvedValue({ id: 'skill-uuid-1', name: 'Backend Security' });
      
      // Mock existing quiz
      mockQuizRepository.findQuizByTitle.mockResolvedValue({ id: 'quiz-uuid-1', title: 'Backend Security' });
      
      // Mock only 4 existing questions in DB
      const existingQuestions = [
        { id: 'q1', questionText: 'Theory 1', type: 'ESSAY' },
        { id: 'q2', questionText: 'Analysis 2', type: 'ESSAY' },
        { id: 'q3', questionText: 'Case 3', type: 'ESSAY' },
        { id: 'q4', questionText: 'Theory 4', type: 'ESSAY' },
      ];
      mockPrismaService.question.findMany
        .mockResolvedValueOnce(existingQuestions) // First check (4)
        .mockResolvedValueOnce([
          ...existingQuestions,
          { id: 'q5', questionText: 'Analysis 5', type: 'ESSAY' },
          { id: 'q6', questionText: 'Case 6', type: 'ESSAY' },
          { id: 'q7', questionText: 'Theory 7', type: 'ESSAY' },
        ]); // Second check (7)

      // Mock AI Fallback generation
      mockAiService.generate.mockResolvedValue({
        questions: [
          { question: 'Analysis 5', type: 'ESSAY', guideline: 'Guide' },
          { question: 'Case 6', type: 'ESSAY', guideline: 'Guide' },
          { question: 'Theory 7', type: 'ESSAY', guideline: 'Guide' },
        ],
      });

      mockQuizRepository.createAttempt.mockResolvedValue({ id: 'attempt-uuid-1' });

      const res = await service.selectMode('user-1', '2', 'Backend Security');

      expect(res.state).toBe('QUESTION_DELIVERED');
      expect(res.data).toEqual({
        attemptId: 'attempt-uuid-1',
        currentQuestionIndex: 0,
        totalQuestions: 7,
        question: {
          id: 'q1',
          questionText: 'Theory 1',
        },
      });

      expect(mockQuizRepository.findQuizByTitle).toHaveBeenCalledWith('Backend Security');
      expect(mockAiService.generate).toHaveBeenCalled();
      expect(mockQuizRepository.addQuestionsToQuiz).toHaveBeenCalledWith('quiz-uuid-1', [
        { questionText: 'Analysis 5', type: 'ESSAY' },
        { questionText: 'Case 6', type: 'ESSAY' },
        { questionText: 'Theory 7', type: 'ESSAY' },
      ]);
    });
  });

  describe('submitAnswer - Sequential Flow to Batch Evaluation', () => {
    let mockSessionQuestions: any[];

    beforeEach(async () => {
      mockSkillsService.findOrCreateMany.mockResolvedValue(['skill-uuid-1']);
      mockPrismaService.skill.findUnique.mockResolvedValue({ id: 'skill-uuid-1', name: 'Backend Security' });
      mockQuizRepository.findQuizByTitle.mockResolvedValue({ id: 'quiz-uuid-1', title: 'Backend Security' });

      mockSessionQuestions = [
        { id: 'q1', questionText: 'Theory 1' },
        { id: 'q2', questionText: 'Analysis 2' },
        { id: 'q3', questionText: 'Case 3' },
        { id: 'q4', questionText: 'Theory 4' },
        { id: 'q5', questionText: 'Analysis 5' },
        { id: 'q6', questionText: 'Case 6' },
        { id: 'q7', questionText: 'Theory 7' },
      ];

      mockPrismaService.question.findMany.mockResolvedValue(mockSessionQuestions);
      mockQuizRepository.createAttempt.mockResolvedValue({ id: 'attempt-uuid-1' });

      // Start the scoring session
      await service.selectMode('user-1', '2', 'Backend Security');
    });

    it('should throw BadRequestException if no session active', async () => {
      await expect(service.submitAnswer('user-2', 'My Answer')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should accept answer sequentially and advance to Q2', async () => {
      mockQuizRepository.findQuestion.mockResolvedValue(mockSessionQuestions[1]); // Next is q2

      const res = await service.submitAnswer('user-1', 'Answer for Q1');

      expect(res.state).toBe('QUESTION_DELIVERED');
      expect(res.data?.currentQuestionIndex).toBe(1);
      expect(res.data?.question.id).toBe('q2');
      expect(mockQuizRepository.saveAnswer).toHaveBeenCalledWith({
        attemptId: 'attempt-uuid-1',
        questionId: 'q1',
        answerText: 'Answer for Q1',
      });
    });

    it('should collect 7 answers, evaluate them batch via AI, compute progression, and finish', async () => {
      // Stub sequential question retrievals
      for (let i = 0; i < 7; i++) {
        mockQuizRepository.findQuestion.mockResolvedValueOnce(mockSessionQuestions[i]);
      }

      // Mock Batch AI evaluation response
      mockAiService.generate.mockResolvedValue({
        sessionScore: 85.0,
        questionEvaluations: mockSessionQuestions.map((q) => ({
          questionId: q.id,
          scores: { theory: 80, analysis: 90, caseStudy: 85 },
          finalScore: 85.0,
        })),
        skillBreakdown: [
          { skillNode: 'Backend Security', evidenceScore: 85.0 },
        ],
      });

      // Submit Q1 through Q6
      for (let i = 0; i < 6; i++) {
        // mock findQuestion for next delivered question
        mockQuizRepository.findQuestion.mockResolvedValueOnce(mockSessionQuestions[i + 1]);
        await service.submitAnswer('user-1', `Answer for Q${i + 1}`);
      }

      // Submit Q7 (triggers batch grading)
      const res = await service.submitAnswer('user-1', 'Answer for Q7');

      expect(res.state).toBe('QUIZ_FINISHED');
      expect(res.data).toEqual({
        attemptId: 'attempt-uuid-1',
        score: 85.0,
        skillBreakdown: [
          { skillNode: 'Backend Security', evidenceScore: 85.0 },
        ],
      });

      expect(mockAiService.generate).toHaveBeenCalled();
      expect(mockQuizRepository.updateAnswerEvaluation).toHaveBeenCalledTimes(7);
      expect(mockQuizRepository.updateAttemptScore).toHaveBeenCalledWith('attempt-uuid-1', 85.0);
      expect(mockSkillEventsService.recordEvent).toHaveBeenCalledWith({
        userId: 'user-1',
        skillId: 'skill-uuid-1',
        sourceType: SourceType.QUIZ,
        sourceId: 'attempt-uuid-1',
        rawScore: 85.0,
        reason: 'Evaluasi ujian topik Backend Security',
      });
    });
  });
});
