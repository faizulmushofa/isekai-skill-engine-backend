import { Injectable, OnModuleInit, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotaService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultConfigs();
  }

  private async seedDefaultConfigs() {
    const defaults = [
      { actionType: 'SKILL_INIT', maxLimit: 1, resetPeriodH: 99999 }, // Basically once per account
      { actionType: 'PROJECT', maxLimit: 1, resetPeriodH: 72 }, // Once per 3 days
      { actionType: 'JOURNAL', maxLimit: 2, resetPeriodH: 24 }, // Twice per day
      { actionType: 'QUIZ', maxLimit: 1, resetPeriodH: 24 },    // Once per day
    ];

    for (const def of defaults) {
      await this.prisma.systemQuotaConfig.upsert({
        where: { actionType: def.actionType },
        update: {}, // don't override existing limits if already seeded
        create: def,
      });
    }
  }

  async checkAndConsumeQuota(userId: string, actionType: string): Promise<void> {
    const config = await this.prisma.systemQuotaConfig.findUnique({
      where: { actionType },
    });

    if (!config) {
      // If no config found, just allow it or fallback to strict. We allow for now.
      return;
    }

    const quota = await this.prisma.userActionQuota.findUnique({
      where: {
        userId_actionType: {
          userId,
          actionType,
        },
      },
    });

    const now = new Date();

    if (!quota) {
      // First time using this action
      await this.prisma.userActionQuota.create({
        data: {
          userId,
          actionType,
          windowStart: now,
          usageCount: 1,
        },
      });
      return;
    }

    // Check if the window has expired
    const windowStart = new Date(quota.windowStart);
    const msSinceStart = now.getTime() - windowStart.getTime();
    const hoursSinceStart = msSinceStart / (1000 * 60 * 60);

    if (hoursSinceStart >= config.resetPeriodH) {
      // Window expired, reset quota
      await this.prisma.userActionQuota.update({
        where: { id: quota.id },
        data: {
          windowStart: now,
          usageCount: 1,
        },
      });
      return;
    }

    // Still in the same window, check limit
    if (quota.usageCount >= config.maxLimit) {
      const remainingMs = (config.resetPeriodH * 60 * 60 * 1000) - msSinceStart;
      const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
      
      throw new HttpException(
        `Quota exceeded for ${actionType}. You can try again in ${remainingHours} hours.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment usage
    await this.prisma.userActionQuota.update({
      where: { id: quota.id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });
  }
}
