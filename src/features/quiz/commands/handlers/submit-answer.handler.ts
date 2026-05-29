import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { AiService } from '../../../../infrastructure/ai/ai.service';
import { QuizRepository } from '../../quiz.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SkillEvidenceGeneratedEvent } from '../../../../shared/events/skill-evidence-generated.event';
import { SubmitAnswerCommand } from '../impl/submit-answer.command';
import { QuizStateResponse } from '../../interfaces/quiz-state.interface';
import { QuizSessionStore } from '../../services/quiz-session.store';
import { QuizBatchEvaluationPrompt } from '../../../../infrastructure/ai/prompt/quiz-batch-evaluation.prompt';

@CommandHandler(SubmitAnswerCommand)
export class SubmitAnswerHandler implements ICommandHandler<SubmitAnswerCommand, QuizStateResponse> {
  constructor(
    private readonly quizRepository: QuizRepository,
    private readonly aiService: AiService,
    private readonly sessionStore: QuizSessionStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: SubmitAnswerCommand): Promise<QuizStateResponse> {
    const { userId, answerText } = command;
    const session = this.sessionStore.get(userId);

    if (!session) {
      throw new BadRequestException('Tidak ada sesi kuis aktif untuk Anda. Silakan mulai kuis baru.');
    }
    if (!answerText || !answerText.trim()) {
      throw new BadRequestException('Jawaban tidak boleh kosong.');
    }

    const currentQuestionId = session.questionIds[session.currentQuestionIndex];

    await this.quizRepository.saveAnswer({
      attemptId: session.attemptId,
      questionId: currentQuestionId,
      answerText: answerText.trim(),
    });

    session.answers.push({
      questionId: currentQuestionId,
      answerText: answerText.trim(),
    });

    session.currentQuestionIndex++;

    if (session.currentQuestionIndex === 7) {
      const qaPairs: Array<{ questionId: string; questionText: string; answerText: string }> = [];
      for (const ans of session.answers) {
        const q = await this.quizRepository.findQuestion(ans.questionId);
        if (!q) throw new NotFoundException(`Soal dengan ID ${ans.questionId} tidak ditemukan.`);
        qaPairs.push({
          questionId: ans.questionId,
          questionText: q.questionText,
          answerText: ans.answerText,
        });
      }

      const evalPrompt = QuizBatchEvaluationPrompt.build({
        skillNode: session.skillNode,
        topic: session.topic,
        qaPairs,
      });

      const aiResult = await this.aiService.generate<{
        sessionScore: number;
        questionEvaluations: Array<{
          questionId: string;
          scores: { theory: number; analysis: number; caseStudy: number };
          finalScore: number;
        }>;
        skillBreakdown: Array<{ skillNode: string; evidenceScore: number }>;
      }>({ ...evalPrompt, userId });

      for (const qEval of aiResult.questionEvaluations) {
        const isCorrect = qEval.finalScore >= 50.0;
        await this.quizRepository.updateAnswerEvaluation(
          session.attemptId,
          qEval.questionId,
          qEval.finalScore,
          isCorrect,
        );
      }

      await this.quizRepository.updateAttemptScore(session.attemptId, aiResult.sessionScore);

      for (const breakdown of aiResult.skillBreakdown) {
        this.eventEmitter.emit(
          'skill.evidence.generated',
          new SkillEvidenceGeneratedEvent(
            userId,
            breakdown.skillNode,
            `Evaluasi ujian topik ${session.topic}`,
            SourceType.QUIZ,
            session.attemptId,
            breakdown.evidenceScore,
            `Evaluasi ujian topik ${session.topic}`,
          ),
        );
      }

      this.sessionStore.delete(userId);

      return {
        state: 'QUIZ_FINISHED',
        message: 'Kuis selesai. Seluruh jawaban Anda telah dievaluasi serentak menggunakan AI.',
        data: {
          attemptId: session.attemptId,
          score: aiResult.sessionScore,
          skillBreakdown: aiResult.skillBreakdown,
        },
      };
    }

    const nextQuestionId = session.questionIds[session.currentQuestionIndex];
    const nextQuestion = await this.quizRepository.findQuestion(nextQuestionId);
    if (!nextQuestion) throw new NotFoundException(`Soal dengan ID ${nextQuestionId} tidak ditemukan.`);

    return {
      state: 'QUESTION_DELIVERED',
      message: `Jawaban disimpan. Menyajikan soal ${session.currentQuestionIndex + 1} dari 7.`,
      data: {
        attemptId: session.attemptId,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: 7,
        question: {
          id: nextQuestion.id,
          questionText: nextQuestion.questionText,
        },
      },
    };
  }
}
