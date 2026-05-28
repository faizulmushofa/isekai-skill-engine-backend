import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UserGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Associate a user with a CareerGoal.
   * Idempotent — uses upsert based on userId + careerGoalId composite key.
   */
  async create(userId: string, careerGoalId: string): Promise<void> {
    await this.prisma.userGoal.upsert({
      where: {
        userId_careerGoalId: { userId, careerGoalId },
      },
      update: {},
      create: { userId, careerGoalId },
    });
  }

  /**
   * Check if a user already has any Career Goal associated.
   */
  async hasGoal(userId: string): Promise<boolean> {
    const goal = await this.prisma.userGoal.findFirst({
      where: { userId },
    });
    return !!goal;
  }
}

