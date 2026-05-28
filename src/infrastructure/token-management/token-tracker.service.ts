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
export class TokenTrackerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenTrackerService.name);
  
  // In-memory counter (Key: provider|model|taskType|userName)
  private memoryStats: Map<string, TokenUsageStats> = new Map();
  private flushInterval: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Flush to DB every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flushToDatabase().catch((err) => 
        this.logger.error(`Error flushing tokens: ${err.message}`)
      );
    }, 5 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushToDatabase(); // Flush before exit
  }

  /**
   * Tracks token usage in memory.
   */
  trackUsage(
    provider: string,
    model: string,
    taskType: string,
    userName: string = 'SYSTEM',
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  ) {
    if (!provider || !model || !taskType) return;

    const key = `${provider}|${model}|${taskType}|${userName}`;

    const current = this.memoryStats.get(key) || {
      provider,
      model,
      taskType,
      userName,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };

    current.promptTokens += usage.promptTokens;
    current.completionTokens += usage.completionTokens;
    current.totalTokens += usage.totalTokens;

    this.memoryStats.set(key, current);
  }

  /**
   * Returns current in-memory stats.
   */
  getInMemoryStats(): Record<string, TokenUsageStats> {
    const stats: Record<string, TokenUsageStats> = {};
    for (const [key, value] of this.memoryStats.entries()) {
      stats[key] = { ...value };
    }
    return stats;
  }

  /**
   * Flushes in-memory stats to the database, aggregating by today's date.
   */
  async flushToDatabase() {
    if (this.memoryStats.size === 0) return;

    // Get today's date (midnight)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const [key, stats] of this.memoryStats.entries()) {
      try {
        await this.prisma.dailyTokenUsage.upsert({
          where: {
            date_provider_model_taskType_userName: {
              date: today,
              provider: stats.provider,
              model: stats.model,
              taskType: stats.taskType,
              userName: stats.userName,
            }
          },
          update: {
            promptTokens: { increment: stats.promptTokens },
            completionTokens: { increment: stats.completionTokens },
            totalTokens: { increment: stats.totalTokens },
            updatedAt: new Date(),
          },
          create: {
            date: today,
            provider: stats.provider,
            model: stats.model,
            taskType: stats.taskType,
            userName: stats.userName,
            promptTokens: stats.promptTokens,
            completionTokens: stats.completionTokens,
            totalTokens: stats.totalTokens,
          }
        });

        // Reset memory for this composite key after successful flush
        this.memoryStats.set(key, {
          provider: stats.provider,
          model: stats.model,
          taskType: stats.taskType,
          userName: stats.userName,
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        });
      } catch (err) {
        this.logger.error(`Failed to flush tokens for ${key}: ${err.message}`);
      }
    }
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
