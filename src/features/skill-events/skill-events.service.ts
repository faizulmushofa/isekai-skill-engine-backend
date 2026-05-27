import { Injectable } from '@nestjs/common';
import { SourceType, SkillEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SkillProgressionService } from '../../shared/progression/services/skill-progression.service';
import { SkillEngineCalibration } from '../../shared/progression/calibration/skill-engine-calibration';
import { SkillMathEngine } from '../../shared/progression/math/skill-math.engine';
import { UserSkillsAggregatorService } from '../user-skills/services/user-skills-aggregator.service';

@Injectable()
export class SkillEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressionService: SkillProgressionService,
    private readonly calibration: SkillEngineCalibration,
    private readonly aggregator: UserSkillsAggregatorService,
  ) {}

  /**
   * Records a learning event in a safe database transaction.
   * Computes the progression, stores the immutable log, and updates the aggregate state.
   * Recursively propagates decaying contributions up the parent-child graph ancestors.
   */
  async recordEvent(params: {
    userId: string;
    skillId: string;
    sourceType: SourceType;
    sourceId: string;
    rawScore: number;
    reason?: string;
    metadata?: Record<string, any>;
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
            ...(params.metadata || {}),
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

      // 5. Trigger recursive propagation up the graph hierarchy
      if (calculation.contribution > 0.001) {
        await this.propagateUp(
          tx,
          calculation.userId,
          calculation.sourceType,
          calculation.sourceId,
          calculation.skillId,
          calculation.contribution,
          params.reason || 'Evidence contribution',
        );
      }

      return event;
    });
  }

  /**
   * Internal recursive helper that crawls up parentId relations
   * and logs decaying propagated scores as separate immutable events.
   */
  private async propagateUp(
    tx: Prisma.TransactionClient,
    userId: string,
    sourceType: SourceType,
    sourceId: string,
    childSkillId: string,
    deltaProgress: number,
    originalReason: string,
  ): Promise<void> {
    // A. Fetch parentId of the child skill
    const childSkill = await tx.skill.findUnique({
      where: { id: childSkillId },
      select: { parentId: true, name: true },
    });

    if (!childSkill || !childSkill.parentId) {
      return; // Base Case: Stop recursion when parent is reached or skill is root
    }

    // B. Calculate decayed contribution
    const decay = this.calibration.PROPAGATION_DECAY;
    const rawPropagatedContribution = deltaProgress * decay;

    if (rawPropagatedContribution <= 0.001) {
      return; // Base Case: Stop recursion when propagation change is negligible
    }

    // C. Read parent current progress
    const parentSkillProgress = await tx.userSkill.findUnique({
      where: {
        userId_skillId: {
          userId,
          skillId: childSkill.parentId,
        },
      },
    });

    const oldProgress = parentSkillProgress ? parentSkillProgress.progress : 0.0;

    // D. Compute clamped new progress and actual contribution delta
    const newProgress = SkillMathEngine.clamp(oldProgress + rawPropagatedContribution, 0, 100);
    const actualContribution = newProgress - oldProgress;

    if (actualContribution <= 0.001) {
      return; // Base Case: Stop if parent is already maxed at 100.0
    }

    // E. Save propagated immutable event
    await tx.skillEvent.create({
      data: {
        userId,
        skillId: childSkill.parentId,
        sourceType,
        sourceId,
        rawScore: 0.0, // Propagated score has 0 raw evidence score
        weightedScore: 0.0,
        contribution: actualContribution,
        oldProgress,
        newProgress,
        reason: `Propagated from "${childSkill.name}": ${originalReason}`,
        metadata: {
          propagatedFrom: childSkillId,
          originalContribution: deltaProgress,
        },
      },
    });

    // F. Update parent projection state
    await this.aggregator.updateProgress(
      tx,
      userId,
      childSkill.parentId,
      newProgress,
    );

    // G. Recurse upward
    await this.propagateUp(
      tx,
      userId,
      sourceType,
      sourceId,
      childSkill.parentId,
      actualContribution,
      originalReason,
    );
  }
}
