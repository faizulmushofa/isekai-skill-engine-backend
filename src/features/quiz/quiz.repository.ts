import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class QuizRepository {
  constructor(private readonly prisma: PrismaService) {}

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

  async createAttempt(userId: string, quizId: string) {
    return this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId,
      },
    });
  }

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

  async findQuestion(questionId: string) {
    if (!questionId) return null;
    return this.prisma.question.findUnique({
      where: { id: questionId },
    });
  }

  async saveAnswer(data: {
    attemptId: string;
    questionId: string;
    answerText: string;
    isCorrect: boolean;
  }) {
    // Check if answer already exists to prevent duplicate submissions
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
          isCorrect: data.isCorrect,
          score: data.isCorrect ? 1 : 0,
        },
      });
    }

    return this.prisma.quizAnswer.create({
      data: {
        quizAttemptId: data.attemptId,
        questionId: data.questionId,
        answerText: data.answerText,
        isCorrect: data.isCorrect,
        score: data.isCorrect ? 1 : 0,
      },
    });
  }

  async findAttemptAnswers(attemptId: string) {
    return this.prisma.quizAnswer.findMany({
      where: {
        quizAttemptId: attemptId,
      },
    });
  }

  async updateAttemptScore(attemptId: string, score: number) {
    return this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score,
      },
    });
  }
}
