import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UserSkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Initialize learning progress for a user across multiple skills.
   * Each UserSkill record starts with progress = 0.
   * Idempotent — uses createMany with skipDuplicates.
   */
  async initializeProgress(userId: string, skillIds: string[]): Promise<void> {
    await this.prisma.userSkill.createMany({
      data: skillIds.map((skillId) => ({
        userId,
        skillId,
        progress: 0,
      })),
      skipDuplicates: true,
    });
  }
}
