import { Injectable, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { AiTaskRouter } from './routing/ai-task-router';
import { StructuredResponseParser } from './parser/structured-response-parser';
import { AiRequest } from './interfaces/ai-request.interface';
import { TokenTrackerService } from '../token-management/token-tracker.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(
    private readonly taskRouter: AiTaskRouter,
    private readonly responseParser: StructuredResponseParser,
    private readonly tokenTracker: TokenTrackerService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Primary entry point for AI content generation.
   * Dynamically routes tasks, runs execution policies, parses JSON, and validates Zod schemas.
   */
  async generate<T>(request: AiRequest): Promise<T> {
    let resolvedUserName = 'SYSTEM';

    if (request.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: request.userId },
        select: { username: true, email: true },
      });
      if (user) {
        resolvedUserName = user.username || user.email || request.userId;
      } else {
        resolvedUserName = request.userId;
      }
    }

    // 1. Check Blocklist
    if (resolvedUserName !== 'SYSTEM') {
      const block = await this.prisma.aiUserBlock.findFirst({
        where: {
          userName: resolvedUserName,
          taskType: { in: [request.taskType, 'ALL'] },
        },
      });

      if (block) {
        throw new ForbiddenException(`Access to AI task '${request.taskType}' is blocked for user '${resolvedUserName}'. Reason: ${block.reason || 'No reason provided'}`);
      }
    }

    // 2. Check Daily Token Limit Guard
    const route = this.taskRouter.getRoute(request.taskType);
    if (!route) {
      throw new InternalServerErrorException(
        `Konfigurasi perutean tidak ditemukan untuk tipe tugas: "${request.taskType}"`,
      );
    }

    if (route.maxDailyTokens && route.maxDailyTokens > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageToday = await this.prisma.dailyTokenUsage.aggregate({
        _sum: {
          totalTokens: true,
        },
        where: {
          date: today,
          provider: route.provider,
          model: route.model,
          taskType: request.taskType,
        },
      });

      const totalUsedToday = usageToday._sum.totalTokens ?? 0;
      if (totalUsedToday >= route.maxDailyTokens) {
        throw new ForbiddenException(
          `Token harian untuk model '${route.model}' pada tugas '${request.taskType}' telah habis (${totalUsedToday}/${route.maxDailyTokens} token). Silakan coba lagi besok.`,
        );
      }
    }

    const { responseText, route: resolvedRoute, usage } = await this.taskRouter.routeAndExecute(
      request.taskType,
      request.systemPrompt,
      request.userPrompt,
    );

    // Track granular usage
    if (usage && resolvedRoute.provider) {
      this.tokenTracker.trackUsage(resolvedRoute.provider, resolvedRoute.model, request.taskType, resolvedUserName, usage);
    }

    // AI Response -> JSON Extraction -> Schema Validation -> Safe Structured Output
    return this.responseParser.parseAndValidate<T>(
      responseText,
      resolvedRoute.responseSchema,
    );
  }
}
