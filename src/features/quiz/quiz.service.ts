import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { QuizRepository } from './quiz.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AiService } from '../../infrastructure/ai/ai.service';
import { SkillsService } from '../skills/skills.service';
import { SkillEventsService } from '../skill-events/skill-events.service';
import { QuizStateResponse } from './interfaces/quiz-state.interface';
import { AssessmentGeneratorPrompt } from '../../infrastructure/ai/prompt/assessment-generator.prompt';
import { QuizBatchEvaluationPrompt } from '../../infrastructure/ai/prompt/quiz-batch-evaluation.prompt';
import { AdaptiveQuizSession } from './interfaces/quiz-state.interface';

@Injectable()
export class QuizService {
  // In-Memory cache to track sequential adaptive exam sessions per user
  private readonly sessions = new Map<string, AdaptiveQuizSession>();

  // Story mode feedback templates
  private readonly storyTemplates = [
    'Menarik sekali ceritamu! Terus tingkatkan belajarmu ya!',
    'Petualangan belajarmu hari ini luar biasa. Tetap konsisten!',
    'Catatan belajarmu sudah disimpan di jurnal petualang!',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly quizRepository: QuizRepository,
    private readonly aiService: AiService,
    private readonly skillsService: SkillsService,
    private readonly skillEventsService: SkillEventsService,
  ) {}

  /**
   * Prompts the user to select their desired mode.
   */
  async startQuiz(userId: string, topic: string): Promise<QuizStateResponse> {
    if (!topic || !topic.trim()) {
      throw new BadRequestException('Topic tidak boleh kosong');
    }

    return {
      state: 'DECISION_REQUIRED',
      message: `Kamu mau:\n1. Cerita belajar saja\n2. Diuji (7 soal adaptif)\n\nBalas: 1 atau 2`,
      data: {
        topic: topic.trim(),
      },
    };
  }

  /**
   * Handles mode selection.
   * Mode 1 (Story): Stateless logging to SkillEvent with contribution = 0.
   * Mode 2 (Scoring): Initializes 7-question adaptive exam.
   */
  async selectMode(
    userId: string,
    mode: '1' | '2',
    topic: string,
  ): Promise<QuizStateResponse> {
    if (!topic || !topic.trim()) {
      throw new BadRequestException('Topic wajib diisi.');
    }

    if (mode === '1') {
      // =========================
      // STATE 1 — STORY MODE
      // =========================
      // 1. Resolve or create the abstract skillNode using the Graph Resolver
      const skillIds = await this.skillsService.findOrCreateMany([
        {
          name: topic.trim(),
          description: `Cerita belajar: ${topic.trim()}`,
        },
      ]);
      const skillId = skillIds[0];

      // Fetch current UserSkill progress or default to 0.0
      const userSkill = await this.prisma.userSkill.findUnique({
        where: { userId_skillId: { userId, skillId } },
      });
      const currentProgress = userSkill ? userSkill.progress : 0.0;

      // 2. Direct log to SkillEvent bypassing Bayesian delta progression (zero impact)
      await this.prisma.skillEvent.create({
        data: {
          userId,
          skillId,
          sourceType: SourceType.QUIZ,
          sourceId: '00000000-0000-0000-0000-000000000000', // Static UUID for Story mode
          rawScore: 0.0,
          weightedScore: 0.0,
          contribution: 0.0, // Strictly zero contribution
          oldProgress: currentProgress,
          newProgress: currentProgress,
          reason: `Cerita belajar saja tentang "${topic.trim()}"`,
          metadata: {
            mode: 'STORY',
            finalContribution: 0,
          },
        },
      });

      // 3. Return random template message
      const randomMsg = this.storyTemplates[
        Math.floor(Math.random() * this.storyTemplates.length)
      ];

      return {
        state: 'EXIT',
        message: randomMsg,
      };
    }

    if (mode === '2') {
      // =========================
      // STATE 2 — SCORING MODE
      // =========================
      // STEP 1: Skill Resolution (Resolve abstract skillNode)
      const skillIds = await this.skillsService.findOrCreateMany([
        {
          name: topic.trim(),
          description: `Ujian kuis topik ${topic.trim()}`,
        },
      ]);
      const skillId = skillIds[0];
      const skill = await this.prisma.skill.findUnique({ where: { id: skillId } });
      if (!skill) {
        throw new NotFoundException(`Skill dengan ID ${skillId} tidak ditemukan.`);
      }
      const skillNode = skill.name;

      // STEP 2: Question Retrieval (DB First)
      let quiz = await this.quizRepository.findQuizByTitle(topic.trim());
      if (!quiz) {
        quiz = await this.quizRepository.createQuiz({
          title: topic.trim(),
          description: `Ujian adaptif topik ${topic.trim()}`,
          difficulty: 'intermediate',
          questions: [],
        });
      }

      let quizQuestions = await this.prisma.question.findMany({
        where: { quizId: quiz.id },
      });

      // STEP 3: Question Generation (AI Fallback reuse ASSESSMENT_GENERATOR)
      while (quizQuestions.length < 7) {
        const aiPrompt = AssessmentGeneratorPrompt.build({
          skill: topic.trim(),
          difficulty: 'intermediate',
        });

        const aiResponse = await this.aiService.generate<{
          questions: Array<{
            question: string;
            type: 'ESSAY' | 'ANALYTICAL';
            guideline: string;
          }>;
        }>(aiPrompt);

        if (aiResponse && aiResponse.questions && aiResponse.questions.length > 0) {
          const generatedQuestions = aiResponse.questions.map((q) => ({
            questionText: q.question,
            type: q.type || 'ESSAY',
          }));

          await this.quizRepository.addQuestionsToQuiz(quiz.id, generatedQuestions);
        }

        quizQuestions = await this.prisma.question.findMany({
          where: { quizId: quiz.id },
        });
      }

      // Pick exactly 7 unique questions for this exam session
      const selectedQuestions = quizQuestions.slice(0, 7);

      // Create new QuizAttempt to act as sessionId
      const attempt = await this.quizRepository.createAttempt(userId, quiz.id);

      // STEP 5: Session State Tracking (Save in-memory)
      this.sessions.set(userId, {
        attemptId: attempt.id,
        topic: topic.trim(),
        skillNode,
        currentQuestionIndex: 0,
        questionIds: selectedQuestions.map((q) => q.id),
        answers: [],
      });

      // STEP 4: Sequential Delivery (Q1 first)
      const q1 = selectedQuestions[0];
      return {
        state: 'QUESTION_DELIVERED',
        message: 'Ujian adaptif diinisialisasi. Silakan jawab pertanyaan pertama.',
        data: {
          attemptId: attempt.id,
          currentQuestionIndex: 0,
          totalQuestions: 7,
          question: {
            id: q1.id,
            questionText: q1.questionText,
          },
        },
      };
    }

    throw new BadRequestException('Pilihan mode tidak valid (Balas 1 atau 2).');
  }

  /**
   * Submit answer sequentially (Q1 -> user answer -> store -> next question -> ... -> Q7)
   */
  async submitAnswer(
    userId: string,
    answerText: string,
  ): Promise<QuizStateResponse> {
    const session = this.sessions.get(userId);
    if (!session) {
      throw new BadRequestException(
        'Tidak ada sesi kuis aktif untuk Anda. Silakan mulai kuis baru.',
      );
    }

    if (answerText === undefined || answerText === null || !answerText.trim()) {
      throw new BadRequestException('Jawaban tidak boleh kosong.');
    }

    const currentQuestionId = session.questionIds[session.currentQuestionIndex];

    // 1. Save answer sequentially to database
    await this.quizRepository.saveAnswer({
      attemptId: session.attemptId,
      questionId: currentQuestionId,
      answerText: answerText.trim(),
    });

    // 2. Log in session
    session.answers.push({
      questionId: currentQuestionId,
      answerText: answerText.trim(),
    });

    // Advance question index
    session.currentQuestionIndex++;

    // 3. STEP 6: After Question 7 Completed ➔ Trigger Batch Evaluation
    if (session.currentQuestionIndex === 7) {
      const qaPairs: Array<{ questionId: string; questionText: string; answerText: string }> = [];
      for (const ans of session.answers) {
        const q = await this.quizRepository.findQuestion(ans.questionId);
        if (!q) {
          throw new NotFoundException(`Soal dengan ID ${ans.questionId} tidak ditemukan.`);
        }
        qaPairs.push({
          questionId: ans.questionId,
          questionText: q.questionText,
          answerText: ans.answerText,
        });
      }

      // Invoke DEDICATED MODEL & PROMPT for grading the 7 answers together
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
      }>(evalPrompt);

      // Save evaluations inside database
      for (const qEval of aiResult.questionEvaluations) {
        const isCorrect = qEval.finalScore >= 50.0;
        await this.quizRepository.updateAnswerEvaluation(
          session.attemptId,
          qEval.questionId,
          qEval.finalScore,
          isCorrect,
        );
      }

      await this.quizRepository.updateAttemptScore(
        session.attemptId,
        aiResult.sessionScore,
      );

      // STEP 7 & 8: Skill Aggregation & Bayesian Update
      for (const breakdown of aiResult.skillBreakdown) {
        const skillIds = await this.skillsService.findOrCreateMany([
          {
            name: breakdown.skillNode,
            description: `Evaluasi ujian topik ${session.topic}`,
          },
        ]);
        const skillId = skillIds[0];

        // Trigger recursive Bayesian propagation up the skill tree ancestors
        await this.skillEventsService.recordEvent({
          userId,
          skillId,
          sourceType: SourceType.QUIZ,
          sourceId: session.attemptId,
          rawScore: breakdown.evidenceScore,
          reason: `Evaluasi ujian topik ${session.topic}`,
        });
      }

      // Cleanup sequential exam session
      this.sessions.delete(userId);

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

    // 4. Deliver Next Question
    const nextQuestionId = session.questionIds[session.currentQuestionIndex];
    const nextQuestion = await this.quizRepository.findQuestion(nextQuestionId);
    if (!nextQuestion) {
      throw new NotFoundException(`Soal dengan ID ${nextQuestionId} tidak ditemukan.`);
    }

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
