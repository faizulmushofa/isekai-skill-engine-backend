import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { AiService } from '../../infrastructure/ai/ai.service';
import { CareerGoalsService } from '../career-goals/career-goals.service';
import { UserGoalsService } from '../user-goals/user-goals.service';
import { SkillsService } from '../skills/skills.service';
import { CareerGoalSkillsService } from '../career-goal-skills/career-goal-skills.service';
import { UserSkillsService } from '../user-skills/user-skills.service';
import {
  SkillInitSession,
  SkillInitStep,
  SkillInitStartResponse,
  SkillInitAnswerResponse,
  SkillInitSelectCareerResponse,
  CareerOption,
} from './interfaces/skill-init.interfaces';
import { SkillInitClassificationPrompt } from '../../infrastructure/ai/prompt/skill-init-classification.prompt';
import { SkillInitAdaptiveQuestionPrompt } from '../../infrastructure/ai/prompt/skill-init-discovery.prompt';
import { SkillInitSkillsPrompt } from '../../infrastructure/ai/prompt/skill-init-skills.prompt';
import { BehavioralCareerAlignmentPrompt } from '../../infrastructure/ai/prompt/behavioral-career-alignment.prompt';
import { z } from 'zod';
import {
  SkillInitClassificationSchema,
  SkillInitAdaptiveQuestionSchema,
  SkillInitSkillsExplanatorSchema,
  BehavioralCareerAlignmentSchema,
} from '../../infrastructure/ai/schemas/ai-schemas';

type ClassificationResult = z.infer<typeof SkillInitClassificationSchema>;
type AdaptiveQuestionResult = z.infer<typeof SkillInitAdaptiveQuestionSchema>;
type SkillsExplanatorResult = z.infer<typeof SkillInitSkillsExplanatorSchema>;
type CareerAlignmentResult = z.infer<typeof BehavioralCareerAlignmentSchema>;

/**
 * SkillInitService — Pure Orchestrator.
 *
 * Responsibilities:
 * - Manage in-memory session state per user.
 * - Coordinate AI task calls in correct order.
 * - Delegate ALL database persistence to domain services.
 *
 * This service MUST NOT import PrismaService directly.
 */
@Injectable()
export class SkillInitService {
  // Hard cap: maximum number of discovery questions allowed
  private readonly MAX_DISCOVERY_QUESTIONS = 10;

  // In-memory session store keyed by userId.
  // Replace with Redis for production multi-instance support.
  private readonly sessions = new Map<string, SkillInitSession>();

  constructor(
    private readonly aiService: AiService,
    private readonly careerGoalsService: CareerGoalsService,
    private readonly userGoalsService: UserGoalsService,
    private readonly skillsService: SkillsService,
    private readonly careerGoalSkillsService: CareerGoalSkillsService,
    private readonly userSkillsService: UserSkillsService,
  ) {}

  // ── Public API ──────────────────────────────────────────────────────────

  /**
   * Step 1: Start skill-init session.
   * Classifies user intent and routes to discovery or direct career options.
   */
  async start(
    userId: string,
    userInput: string,
  ): Promise<SkillInitStartResponse> {
    if (this.sessions.has(userId)) {
      throw new ConflictException(
        'Sesi skill-init sudah aktif. Selesaikan atau reset sesi sebelumnya.',
      );
    }

    // Initialize session
    const session: SkillInitSession = {
      userId,
      step: 'CLASSIFY',
      discoveryAnswers: [],
      discoveredTraits: [],
    };

    // AI: Classify intent
    const classification = await this.aiService.generate<ClassificationResult>(
      SkillInitClassificationPrompt.build({ userInput }),
    );

    session.intent = classification.intent;

    if (classification.intent === 'DIRECT_GOAL' && classification.careerName) {
      // Skip discovery — go straight to career alignment
      const careerOptions = await this.fetchCareerOptions(
        classification.careerName,
        [],
      );
      session.careerOptions = careerOptions;
      session.step = 'CAREER_SELECTION';
      this.sessions.set(userId, session);

      return {
        step: 'CAREER_SELECTION',
        intent: 'DIRECT_GOAL',
        message: `Karier "${classification.careerName}" terdeteksi. Pilih salah satu opsi berikut:`,
        careerOptions,
      };
    }

    // VAGUE_GOAL or EMPTY — begin discovery quiz
    const firstQuestion =
      await this.aiService.generate<AdaptiveQuestionResult>(
        SkillInitAdaptiveQuestionPrompt.build({
          previousAnswers: [],
          totalAnswers: 0,
        }),
      );

    session.step = 'DISCOVERY';
    this.sessions.set(userId, session);

    return {
      step: 'DISCOVERY',
      intent: classification.intent,
      message: 'Mari kita temukan arah kariermu melalui beberapa pertanyaan.',
      question: firstQuestion.question,
      dimension: firstQuestion.dimension,
    };
  }

  /**
   * Step 2: Submit answer to discovery quiz.
   * Continues RIASEC questions until complete, then presents career options.
   */
  async answer(
    userId: string,
    answerText: string,
  ): Promise<SkillInitAnswerResponse> {
    const session = this.getActiveSession(userId);

    if (session.step !== 'DISCOVERY') {
      throw new BadRequestException(
        `Tidak dapat menjawab di langkah saat ini: ${session.step}`,
      );
    }

    // Record answer
    session.discoveryAnswers.push(answerText);

    const totalAnswers = session.discoveryAnswers.length;
    const isAtLimit = totalAnswers >= this.MAX_DISCOVERY_QUESTIONS;

    // AI: Get next question or conclude discovery
    const result = await this.aiService.generate<AdaptiveQuestionResult>(
      SkillInitAdaptiveQuestionPrompt.build({
        previousAnswers: session.discoveryAnswers,
        totalAnswers,
      }),
    );

    // Force completion if hard cap reached OR AI says complete
    if (result.isDiscoveryComplete || isAtLimit) {
      // Discovery complete — extract traits and generate career options
      session.discoveredTraits = result.discoveredTraits ?? [];

      // Use discovered traits to run behavioral career alignment
      const careerOptions = await this.fetchCareerOptions(
        'based on RIASEC discovery',
        session.discoveredTraits,
      );
      session.careerOptions = careerOptions;
      session.step = 'CAREER_SELECTION';
      this.sessions.set(userId, session);

      return {
        step: 'CAREER_SELECTION',
        message: 'Penemuan selesai! Berikut opsi karier yang cocok untukmu:',
        careerOptions,
      };
    }

    // Continue discovery
    this.sessions.set(userId, session);
    return {
      step: 'DISCOVERY',
      message: `Pertanyaan ${totalAnswers + 1}/${this.MAX_DISCOVERY_QUESTIONS}:`,
      question: result.question,
      dimension: result.dimension,
    };
  }

  /**
   * Step 3: Select a career and finalize skill initialization.
   * Persists CareerGoal → UserGoal → Skills → CareerGoalSkills → UserSkills via domain services.
   */
  async selectCareer(
    userId: string,
    careerName: string,
  ): Promise<SkillInitSelectCareerResponse> {
    const session = this.getActiveSession(userId);

    if (session.step !== 'CAREER_SELECTION') {
      throw new BadRequestException(
        'Belum saatnya memilih karier. Selesaikan proses discovery terlebih dahulu.',
      );
    }

    // Validate chosen career is from provided options
    const isValidChoice = session.careerOptions?.some(
      (c) => c.title.toLowerCase() === careerName.toLowerCase(),
    );
    if (!isValidChoice) {
      throw new BadRequestException(
        `Karier "${careerName}" tidak ada dalam opsi yang ditawarkan.`,
      );
    }

    session.selectedCareer = careerName;
    session.step = 'SKILLS_GENERATION';

    // AI: Generate root skills
    const skillsResult = await this.aiService.generate<SkillsExplanatorResult>(
      SkillInitSkillsPrompt.build({
        careerName,
        discoveredTraits: session.discoveredTraits,
      }),
    );

    // ── Persist via domain services (orchestration only, no Prisma here) ──

    // 1. Find or create CareerGoal
    const careerGoalId =
      await this.careerGoalsService.findOrCreate(careerName);

    // 2. Associate user with career goal
    await this.userGoalsService.create(userId, careerGoalId);

    // 3. Upsert all skills
    const skillIds = await this.skillsService.findOrCreateMany(
      skillsResult.skills.map((s) => ({
        name: s.name,
        description: s.description,
      })),
    );

    // 4. Link skills to career goal
    await this.careerGoalSkillsService.linkSkills(careerGoalId, skillIds);

    // 5. Initialize user's learning progress for each skill
    await this.userSkillsService.initializeProgress(userId, skillIds);

    // Cleanup session
    session.step = 'DONE';
    this.sessions.delete(userId);

    return {
      step: 'DONE',
      message: `Inisialisasi keahlian untuk karier "${careerName}" berhasil! Perjalananmu dimulai sekarang.`,
      initializedSkills: skillsResult.skills,
    };
  }

  /**
   * Get current session state for a user.
   */
  getSessionStatus(userId: string): SkillInitStep | null {
    return this.sessions.get(userId)?.step ?? null;
  }

  /**
   * Reset/abort an active session.
   */
  resetSession(userId: string): void {
    this.sessions.delete(userId);
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private getActiveSession(userId: string): SkillInitSession {
    const session = this.sessions.get(userId);
    if (!session) {
      throw new BadRequestException(
        'Tidak ada sesi skill-init aktif. Panggil /skill-init/start terlebih dahulu.',
      );
    }
    return session;
  }

  private async fetchCareerOptions(
    context: string,
    traits: string[],
  ): Promise<CareerOption[]> {
    const result = await this.aiService.generate<CareerAlignmentResult>(
      BehavioralCareerAlignmentPrompt.build({
        hobbies: [],
        habits: [],
        interests: [context],
        preferredActivities: traits.length > 0 ? traits : [context],
        personalityTraits: traits,
      }),
    );

    return result.careerGoals.map((cg) => ({
      title: cg.title,
      confidence: cg.confidence,
      matchFactors: cg.matchFactors,
      reason: cg.reason,
    }));
  }
}
