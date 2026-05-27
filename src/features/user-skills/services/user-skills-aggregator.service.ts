import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { SkillMathEngine } from '../../../shared/progression/math/skill-math.engine';
import { SkillEngineCalibration } from '../../../shared/progression/calibration/skill-engine-calibration';

@Injectable()
export class UserSkillsAggregatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calibration: SkillEngineCalibration,
  ) {}

  /**
   * Performs real-time fast-path state aggregation update for a user skill.
   */
  async updateProgress(
    tx: Prisma.TransactionClient,
    userId: string,
    skillId: string,
    newProgress: number,
  ): Promise<void> {
    await tx.userSkill.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId,
        },
      },
      update: {
        progress: newProgress,
        updatedAt: new Date(),
      },
      create: {
        userId,
        skillId,
        progress: newProgress,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Replays all historical events for a user chronologically to rebuild UserSkill progress.
   * Supports two highly strategic modes:
   * 1. 'SUM': Quick incremental contribution tally (100% deterministic to saved actions).
   * 2. 'RECALCULATE': Re-run Bayesian formula calculations sequentially from 0.0.
   */
  async replayAllEventsForUser(
    userId: string,
    mode: 'SUM' | 'RECALCULATE' = 'SUM',
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // 1. Load all historical learning events sorted chronologically
      const events = await tx.skillEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      if (events.length === 0) return;

      const skillIds = Array.from(new Set(events.map((e) => e.skillId)));

      // 2. Clear progress aggregation state
      await tx.userSkill.updateMany({
        where: {
          userId,
          skillId: { in: skillIds },
        },
        data: {
          progress: 0.0,
        },
      });

      if (mode === 'SUM') {
        // Fast contribution sum mode
        const skillTotals = new Map<string, number>();

        for (const event of events) {
          const current = skillTotals.get(event.skillId) || 0.0;
          const updated = SkillMathEngine.clamp(current + event.contribution, 0, 100);
          skillTotals.set(event.skillId, updated);
        }

        for (const [skillId, totalProgress] of skillTotals.entries()) {
          await this.updateProgress(tx, userId, skillId, totalProgress);
        }
      } else {
        // Sequential Bayesian Recalculation mode
        const skillProgressMap = new Map<string, number>();

        for (const event of events) {
          const oldProgress = skillProgressMap.get(event.skillId) || 0.0;
          const params = this.calibration.getParams(event.sourceType);
          const weightedScore = SkillMathEngine.scaleScore(event.rawScore, params.weight);
          const newProgress = SkillMathEngine.bayesianUpdate(oldProgress, weightedScore, params.alpha);
          skillProgressMap.set(event.skillId, newProgress);
        }

        for (const [skillId, finalProgress] of skillProgressMap.entries()) {
          await this.updateProgress(tx, userId, skillId, finalProgress);
        }
      }
    });
  }
}
