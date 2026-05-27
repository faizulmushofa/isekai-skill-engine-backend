import { Injectable } from '@nestjs/common';
import { SourceType, SkillEvent } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SkillProgressionService } from '../../shared/progression/services/skill-progression.service';
import { UserSkillsAggregatorService } from '../user-skills/services/user-skills-aggregator.service';

@Injectable()
export class SkillEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressionService: SkillProgressionService,
    private readonly aggregator: UserSkillsAggregatorService,
  ) {}

  /**
   * Records a learning event in a safe database transaction.
   * Computes the progression, stores the immutable log, and updates the aggregate state.
   */
  async recordEvent(params: {
    userId: string;
    skillId: string;
    sourceType: SourceType;
    sourceId: string;
    rawScore: number;
    reason?: string;
  }): Promise<SkillEvent> {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Fetch current UserSkill progress or default to 0.0
      const userSkill = await tx.userSkill.findUnique({
        where: {
          userId_skillId: {
            userId: params.userId,
            skillId: params.skillId,
          },
        },
      });

      const oldProgress = userSkill ? userSkill.progress : 0.0;

      // 2. Perform the progression calculation (stateless orchestrator)
      const calculation = this.progressionService.computeProgress({
        userId: params.userId,
        skillId: params.skillId,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        rawScore: params.rawScore,
        oldProgress,
      });

      // 3. Persist the immutable event log
      const event = await tx.skillEvent.create({
        data: {
          userId: calculation.userId,
          skillId: calculation.skillId,
          sourceType: calculation.sourceType,
          sourceId: calculation.sourceId,
          rawScore: calculation.rawScore,
          weightedScore: calculation.weightedScore,
          contribution: calculation.contribution,
          oldProgress: calculation.oldProgress,
          newProgress: calculation.newProgress,
          reason: params.reason || null,
          metadata: {
            formulaVersion: calculation.formulaVersion,
          },
        },
      });

      // 4. Update the Projection Layer (UserSkill progress state)
      await this.aggregator.updateProgress(
        tx,
        calculation.userId,
        calculation.skillId,
        calculation.newProgress,
      );

      return event;
    });
  }
}
