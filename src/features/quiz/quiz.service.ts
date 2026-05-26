import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { QuizRepository } from './quiz.repository';
import { QuizEngine } from './quiz.engine';
import { QuizStateResponse } from './interfaces/quiz-state.interface';

@Injectable()
export class QuizService {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly quizEngine: QuizEngine,
  ) {}

  /**
   * Initiates the quiz request, prompting the user for a decision.
   */
  startQuiz(userId: string, topic: string): Promise<QuizStateResponse> {
    if (!topic || !topic.trim()) {
      return Promise.reject(
        new BadRequestException('Topic tidak boleh kosong'),
      );
    }

    return Promise.resolve({
      state: 'DECISION_REQUIRED',
      message: 'Kamu mau test terkait topik ini untuk mendapatkan score?',
      data: {
        topic: topic.trim(),
      },
    });
  }

  /**
   * Handles the user's YES/NO decision for the requested quiz topic.
   */
  async handleDecision(
    userId: string,
    decision: 'YES' | 'NO',
    topic: string,
  ): Promise<QuizStateResponse> {
    if (!topic || !topic.trim()) {
      throw new BadRequestException(
        'Topic wajib diisi untuk menentukan keputusan',
      );
    }

    if (decision === 'NO') {
      return {
        state: 'EXIT',
        message: 'Oke semangat belajar ya',
      };
    }

    if (decision !== 'YES') {
      throw new BadRequestException(
        'Keputusan tidak valid (harus YES atau NO)',
      );
    }

    // Load or generate quiz
    const quiz = await this.createQuizIfNotExists(topic);

    // Start attempt
    const attempt = await this.createAttempt(userId, quiz.id);

    return {
      state: 'QUIZ_STARTED',
      message: 'Quiz successfully loaded and started',
      data: {
        attemptId: attempt.id,
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          questions: quiz.questions.map((q) => ({
            id: q.id,
            questionText: q.questionText,
          })),
        },
      },
    };
  }

  /**
   * Loads a quiz by topic title from the database.
   */
  async loadQuiz(topic: string) {
    return this.quizRepository.findQuizByTitle(topic);
  }

  /**
   * Helper that retrieves a quiz by topic or generates it if it doesn't exist.
   */
  async createQuizIfNotExists(topic: string) {
    const existingQuiz = await this.loadQuiz(topic);
    if (existingQuiz) {
      return existingQuiz;
    }

    // Call placeholder generator
    const generated = this.quizEngine.generateQuiz(topic);

    // Save generated quiz and questions
    return this.quizRepository.createQuiz(generated);
  }

  /**
   * Helper to create a new QuizAttempt.
   */
  async createAttempt(userId: string, quizId: string) {
    return this.quizRepository.createAttempt(userId, quizId);
  }

  /**
   * Submits an answer for a specific question within a quiz attempt.
   */
  async submitAnswer(
    attemptId: string,
    questionId: string,
    answerText: string,
  ): Promise<QuizStateResponse> {
    if (!attemptId) {
      throw new BadRequestException('attemptId wajib diisi');
    }
    if (!questionId) {
      throw new BadRequestException('questionId wajib diisi');
    }
    if (answerText === undefined || answerText === null) {
      throw new BadRequestException('answerText wajib diisi');
    }

    const attempt = await this.quizRepository.findAttempt(attemptId);
    if (!attempt) {
      throw new NotFoundException(
        `Quiz attempt dengan ID '${attemptId}' tidak ditemukan`,
      );
    }

    const question = await this.quizRepository.findQuestion(questionId);
    if (!question || question.quizId !== attempt.quizId) {
      throw new NotFoundException(
        `Question dengan ID '${questionId}' tidak ditemukan di quiz ini`,
      );
    }

    // Evaluate answer correctness using isolated QuizEngine rules
    const isCorrect = this.quizEngine.evaluateAnswer(answerText, question.type);

    // Save the answer
    await this.quizRepository.saveAnswer({
      attemptId,
      questionId,
      answerText: answerText.trim(),
      isCorrect,
    });

    const answers = await this.quizRepository.findAttemptAnswers(attemptId);
    const score = this.quizEngine.calculateScore(answers);

    return {
      state: 'ANSWER_SUBMITTED',
      message: 'Answer successfully submitted',
      data: {
        isCorrect,
        correct: isCorrect,
        score,
      },
    };
  }

  /**
   * Calculates the final quiz score, updates the attempt, and returns results.
   */
  async finishQuiz(attemptId: string): Promise<QuizStateResponse> {
    if (!attemptId) {
      throw new BadRequestException('attemptId wajib diisi');
    }

    const attempt = await this.quizRepository.findAttempt(attemptId);
    if (!attempt) {
      throw new NotFoundException(
        `Quiz attempt dengan ID '${attemptId}' tidak ditemukan`,
      );
    }

    const answers = await this.quizRepository.findAttemptAnswers(attemptId);

    // Compute total score using QuizEngine scoring rules (+1 for correct, 0 for incorrect)
    const score = this.quizEngine.calculateScore(answers);

    // Update attempt record
    await this.quizRepository.updateAttemptScore(attemptId, score);

    return {
      state: 'QUIZ_FINISHED',
      message: 'Quiz completed',
      data: {
        score,
        totalQuestions: attempt.quiz.questions.length,
        totalScore: score,
        maxScore: attempt.quiz.questions.length,
      },
    };
  }
}
