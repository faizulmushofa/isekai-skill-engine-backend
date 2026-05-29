import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find a quiz by title, including all associated questions.
   */
  async findQuizByTitle(title: string) {
    if (!title) return null;
    return this.prisma.quiz.findFirst({
      where: {
        title: {
          equals: title,
          mode: 'insensitive',
        },
      },
      include: {
        questions: true,
      },
    });
  }

  /**
   * Create a new quiz with an initial set of questions.
   */
  async createQuiz(data: {
    title: string;
    description: string;
    difficulty: string;
    questions: { questionText: string; type: string }[];
  }) {
    return this.prisma.quiz.create({
      data: {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        questions: {
          create: data.questions.map((q) => ({
            questionText: q.questionText,
            type: q.type,
          })),
        },
      },
      include: {
        questions: true,
      },
    });
  }

  /**
   * Dynamically appends new questions to an existing quiz in the database.
   */
  async addQuestionsToQuiz(
    quizId: string,
    questions: { questionText: string; type: string }[],
  ) {
    await this.prisma.question.createMany({
      data: questions.map((q) => ({
        quizId,
        questionText: q.questionText,
        type: q.type,
      })),
    });

    return this.prisma.question.findMany({
      where: { quizId },
    });
  }

  /**
   * Create a new QuizAttempt record.
   */
  async createAttempt(userId: string, quizId: string) {
    return this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
      },
    });
  }

  /**
   * Find a quiz attempt, including associated quiz, questions, and answers.
   */
  async findAttempt(attemptId: string) {
    if (!attemptId) return null;
    return this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          include: {
            questions: true,
          },
        },
        quizAnswers: true,
      },
    });
  }

  /**
   * Find a specific question by ID.
   */
  async findQuestion(questionId: string) {
    if (!questionId) return null;
    return this.prisma.question.findUnique({
      where: { id: questionId },
    });
  }

  /**
   * Save a user's answer during sequential execution.
   */
  async saveAnswer(data: {
    attemptId: string;
    questionId: string;
    answerText: string;
    isCorrect?: boolean;
    score?: number;
  }) {
    const existing = await this.prisma.quizAnswer.findFirst({
      where: {
        quizAttemptId: data.attemptId,
        questionId: data.questionId,
      },
    });

    if (existing) {
      return this.prisma.quizAnswer.update({
        where: { id: existing.id },
        data: {
          answerText: data.answerText,
          isCorrect: data.isCorrect ?? null,
          score: data.score ?? null,
        },
      });
    }

    return this.prisma.quizAnswer.create({
      data: {
        quizAttemptId: data.attemptId,
        questionId: data.questionId,
        answerText: data.answerText,
        isCorrect: data.isCorrect ?? null,
        score: data.score ?? null,
      },
    });
  }

  /**
   * Update the final score and correctness for a specific answer after batch evaluation.
   */
  async updateAnswerEvaluation(
    attemptId: string,
    questionId: string,
    score: number,
    isCorrect: boolean,
  ) {
    const existing = await this.prisma.quizAnswer.findFirst({
      where: {
        quizAttemptId: attemptId,
        questionId,
      },
    });

    if (existing) {
      return this.prisma.quizAnswer.update({
        where: { id: existing.id },
        data: {
          score,
          isCorrect,
        },
      });
    }
  }

  /**
   * Find all quiz answers submitted under a specific attempt.
   */
  async findAttemptAnswers(attemptId: string) {
    return this.prisma.quizAnswer.findMany({
      where: {
        quizAttemptId: attemptId,
      },
    });
  }

  /**
   * Update the final cumulative score for a quiz attempt.
   */
  async updateAttemptScore(attemptId: string, score: number) {
    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score,
      },
    });
  }
}
