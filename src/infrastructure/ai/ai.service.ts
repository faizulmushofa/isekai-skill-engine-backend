import { Injectable, ForbiddenException } from '@nestjs/common';
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

    const { responseText, route, usage } = await this.taskRouter.routeAndExecute(
      request.taskType,
      request.systemPrompt,
      request.userPrompt,
    );

    // Track granular usage
    if (usage && route.provider) {
      this.tokenTracker.trackUsage(route.provider, route.model, request.taskType, resolvedUserName, usage);
    }

    // AI Response -> JSON Extraction -> Schema Validation -> Safe Structured Output
    return this.responseParser.parseAndValidate<T>(
      responseText,
      route.responseSchema,
    );
  }
}
