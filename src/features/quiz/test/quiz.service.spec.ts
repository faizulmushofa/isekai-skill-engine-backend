import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from '../quiz.service';
import { QuizRepository } from '../quiz.repository';
import { QuizEngine } from '../quiz.engine';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('QuizService', () => {
  let service: QuizService;

  const mockQuizRepository = {
    findQuizByTitle: jest.fn(),
    createQuiz: jest.fn(),
    createAttempt: jest.fn(),
    findAttempt: jest.fn(),
    findQuestion: jest.fn(),
    saveAnswer: jest.fn(),
    findAttemptAnswers: jest.fn(),
    updateAttemptScore: jest.fn(),
  };

  const mockQuizEngine = {
    generateQuiz: jest.fn(),
    evaluateAnswer: jest.fn(),
    calculateScore: jest.fn(),
  };

  const mockQuiz = {
    id: 'quiz-uuid-123',
    title: 'TypeScript Assessment',
    description: 'A short test of your TypeScript skills',
    difficulty: 'MEDIUM',
    questions: [
      {
        id: 'q-1',
        quizId: 'quiz-uuid-123',
        questionText: 'What is TypeScript?',
        type: 'A',
      },
      {
        id: 'q-2',
        quizId: 'quiz-uuid-123',
        questionText: 'Is TS typed?',
        type: 'B',
      },
    ],
  };

  const mockAttempt = {
    id: 'attempt-uuid-456',
    userId: 'user-uuid-1',
    quizId: 'quiz-uuid-123',
    quiz: mockQuiz,
    quizAnswers: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: QuizRepository,
          useValue: mockQuizRepository,
        },
        {
          provide: QuizEngine,
          useValue: mockQuizEngine,
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('startQuiz', () => {
    it('should prompt user for a decision and return DECISION_REQUIRED', async () => {
      const result = await service.startQuiz('user-1', 'TypeScript');

      expect(result).toEqual({
        state: 'DECISION_REQUIRED',
        message: 'Kamu mau test terkait topik ini untuk mendapatkan score?',
        data: {
          topic: 'TypeScript',
        },
      });
    });

    it('should throw BadRequestException if topic is empty', async () => {
      await expect(service.startQuiz('user-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleDecision', () => {
    it('should exit flow gracefully if decision is NO', async () => {
      const result = await service.handleDecision('user-1', 'NO', 'TypeScript');

      expect(result).toEqual({
        state: 'EXIT',
        message: 'Oke semangat belajar ya',
      });
      expect(mockQuizRepository.findQuizByTitle).not.toHaveBeenCalled();
    });

    it('should load quiz, create attempt, and return QUIZ_STARTED if decision is YES and quiz exists', async () => {
      mockQuizRepository.findQuizByTitle.mockResolvedValue(mockQuiz);
      mockQuizRepository.createAttempt.mockResolvedValue(mockAttempt);

      const result = await service.handleDecision(
        'user-1',
        'YES',
        'TypeScript',
      );

      expect(result.state).toBe('QUIZ_STARTED');
      const data = result.data as {
        attemptId: string;
        quiz: {
          id: string;
          questions: { id: string; questionText: string }[];
        };
      };
      expect(data.attemptId).toBe('attempt-uuid-456');
      expect(data.quiz.id).toBe('quiz-uuid-123');
      expect(data.quiz.questions[0].id).toBe('q-1');
      expect(data.quiz.questions[0]).not.toHaveProperty('type'); // Security test: correct answer not exposed
      expect(mockQuizRepository.findQuizByTitle).toHaveBeenCalledWith(
        'TypeScript',
      );
      expect(mockQuizRepository.createQuiz).not.toHaveBeenCalled();
    });

    it('should generate quiz, save to DB, create attempt, and return QUIZ_STARTED if decision is YES and quiz not exists', async () => {
      mockQuizRepository.findQuizByTitle.mockResolvedValue(null);
      mockQuizEngine.generateQuiz.mockReturnValue({
        title: 'TypeScript Assessment',
        description: 'A test',
        difficulty: 'MEDIUM',
        questions: [{ questionText: 'What is TypeScript?', type: 'A' }],
      });
      mockQuizRepository.createQuiz.mockResolvedValue(mockQuiz);
      mockQuizRepository.createAttempt.mockResolvedValue(mockAttempt);

      const result = await service.handleDecision(
        'user-1',
        'YES',
        'TypeScript',
      );

      expect(result.state).toBe('QUIZ_STARTED');
      expect(mockQuizEngine.generateQuiz).toHaveBeenCalledWith('TypeScript');
      expect(mockQuizRepository.createQuiz).toHaveBeenCalled();
      expect(mockQuizRepository.createAttempt).toHaveBeenCalledWith(
        'user-1',
        'quiz-uuid-123',
      );
    });

    it('should throw BadRequestException if decision is invalid', async () => {
      await expect(
        service.handleDecision(
          'user-1',
          'INVALID' as unknown as 'YES' | 'NO',
          'TypeScript',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('submitAnswer', () => {
    it('should successfully evaluate and save a correct answer', async () => {
      mockQuizRepository.findAttempt.mockResolvedValue(mockAttempt);
      mockQuizRepository.findQuestion.mockResolvedValue(mockQuiz.questions[0]);
      mockQuizEngine.evaluateAnswer.mockReturnValue(true);
      mockQuizRepository.saveAnswer.mockResolvedValue({ id: 'ans-1' } as any);

      mockQuizRepository.findAttemptAnswers.mockResolvedValue([
        { id: 'ans-1', isCorrect: true },
      ]);
      mockQuizEngine.calculateScore.mockReturnValue(1);

      const result = await service.submitAnswer('attempt-uuid-456', 'q-1', 'A');

      expect(result).toEqual({
        state: 'ANSWER_SUBMITTED',
        message: 'Answer successfully submitted',
        data: {
          isCorrect: true,
          correct: true,
          score: 1,
        },
      });
      expect(mockQuizEngine.evaluateAnswer).toHaveBeenCalledWith('A', 'A');
      expect(mockQuizRepository.saveAnswer).toHaveBeenCalledWith({
        attemptId: 'attempt-uuid-456',
        questionId: 'q-1',
        answerText: 'A',
        isCorrect: true,
      });
    });

    it('should throw NotFoundException if attempt does not exist', async () => {
      mockQuizRepository.findAttempt.mockResolvedValue(null);

      await expect(
        service.submitAnswer('wrong-attempt', 'q-1', 'A'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('finishQuiz', () => {
    it('should aggregate correct answers, save result, and finish attempt', async () => {
      const mockAnswers = [
        { id: 'ans-1', isCorrect: true },
        { id: 'ans-2', isCorrect: false },
      ];
      mockQuizRepository.findAttempt.mockResolvedValue(mockAttempt);
      mockQuizRepository.findAttemptAnswers.mockResolvedValue(mockAnswers);
      mockQuizEngine.calculateScore.mockReturnValue(1);
      mockQuizRepository.updateAttemptScore.mockResolvedValue({
        ...mockAttempt,
        score: 1,
      } as any);

      const result = await service.finishQuiz('attempt-uuid-456');

      expect(result).toEqual({
        state: 'QUIZ_FINISHED',
        message: 'Quiz completed',
        data: {
          score: 1,
          totalQuestions: 2, // mockQuiz has 2 questions
          totalScore: 1,
          maxScore: 2,
        },
      });
      expect(mockQuizEngine.calculateScore).toHaveBeenCalledWith(mockAnswers);
      expect(mockQuizRepository.updateAttemptScore).toHaveBeenCalledWith(
        'attempt-uuid-456',
        1,
      );
    });
  });
});
