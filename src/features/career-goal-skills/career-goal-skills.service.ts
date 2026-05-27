import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CareerGoalSkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Link multiple skills to a CareerGoal.
   * Idempotent — uses createMany with skipDuplicates.
   */
  async linkSkills(careerGoalId: string, skillIds: string[]): Promise<void> {
    await this.prisma.careerGoalSkill.createMany({
      data: skillIds.map((skillId) => ({ careerGoalId, skillId })),
      skipDuplicates: true,
    });
  }
}
