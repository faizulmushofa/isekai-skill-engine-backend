import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../../../infrastructure/ai/ai.service';
import { QuizRepository } from '../../quiz.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SkillEvidenceGeneratedEvent } from '../../../../shared/events/skill-evidence-generated.event';
import { SelectModeCommand } from '../impl/select-mode.command';
import { QuizStateResponse } from '../../interfaces/quiz-state.interface';
import { QuizSessionStore } from '../../services/quiz-session.store';
import { AssessmentGeneratorPrompt } from '../../../../infrastructure/ai/prompt/assessment-generator.prompt';

@CommandHandler(SelectModeCommand)
export class SelectModeHandler implements ICommandHandler<SelectModeCommand, QuizStateResponse> {
  private readonly storyTemplates = [
    'Menarik sekali ceritamu! Terus tingkatkan belajarmu ya!',
    'Petualangan belajarmu hari ini luar biasa. Tetap konsisten!',
    'Catatan belajarmu sudah disimpan di jurnal petualang!',
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly quizRepository: QuizRepository,
    private readonly aiService: AiService,
    private readonly sessionStore: QuizSessionStore,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: SelectModeCommand): Promise<QuizStateResponse> {
    const { userId, mode, topic } = command;

    if (!topic || !topic.trim()) {
      throw new BadRequestException('Topic wajib diisi.');
    }

    if (mode === '1') {
      // Trigger zero-score evidence to create the skill in background and log the event
      this.eventEmitter.emit(
        'skill.evidence.generated',
        new SkillEvidenceGeneratedEvent(
          userId,
          topic.trim(),
          `Cerita belajar: ${topic.trim()}`,
          SourceType.QUIZ,
          '00000000-0000-0000-0000-000000000000', // Dummy ID for story mode
          0.0,
          `Cerita belajar saja tentang "${topic.trim()}"`,
        ),
      );

      const randomMsg = this.storyTemplates[Math.floor(Math.random() * this.storyTemplates.length)];
      return { state: 'EXIT', message: randomMsg };
    }

    if (mode === '2') {
      const skillNode = topic.trim();

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
        }>({ ...aiPrompt, userId });

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

      const selectedQuestions = quizQuestions.slice(0, 7);
      const attempt = await this.quizRepository.createAttempt(userId, quiz.id);

      this.sessionStore.set(userId, {
        attemptId: attempt.id,
        topic: topic.trim(),
        skillNode,
        currentQuestionIndex: 0,
        questionIds: selectedQuestions.map((q) => q.id),
        answers: [],
      });

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
}
