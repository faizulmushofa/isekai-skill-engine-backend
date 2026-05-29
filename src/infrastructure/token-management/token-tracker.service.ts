import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TokenUsageStats {
  provider: string;
  model: string;
  taskType: string;
  userName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

@Injectable()
export class TokenTrackerService {
  private readonly logger = new Logger(TokenTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Tracks token usage by asynchronously upserting to the database.
   * We do not await this in the main execution path to avoid blocking the user response.
   */
  async trackUsage(
    provider: string,
    model: string,
    taskType: string,
    userName: string = 'SYSTEM',
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  ) {
    if (!provider || !model || !taskType) return;

    try {
      // Get today's date (midnight)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await this.prisma.dailyTokenUsage.upsert({
        where: {
          date_provider_model_taskType_userName: {
            date: today,
            provider,
            model,
            taskType,
            userName,
          }
        },
        update: {
          promptTokens: { increment: usage.promptTokens },
          completionTokens: { increment: usage.completionTokens },
          totalTokens: { increment: usage.totalTokens },
          updatedAt: new Date(),
        },
        create: {
          date: today,
          provider,
          model,
          taskType,
          userName,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to track token usage for ${provider}|${model}|${taskType}|${userName}: ${error.message}`
      );
    }
  }

  /**
   * Returns current in-memory stats (now deprecated, returns empty as we write directly to DB).
   */
  getInMemoryStats(): Record<string, TokenUsageStats> {
    return {};
  }

  /**
   * Fetch historical daily stats from DB
   */
  async getDbStats() {
    return this.prisma.dailyTokenUsage.findMany({
      orderBy: { date: 'desc' },
      take: 30, // Last 30 days
    });
  }
}
