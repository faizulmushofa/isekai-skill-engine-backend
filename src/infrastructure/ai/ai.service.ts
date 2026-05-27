import { Injectable } from '@nestjs/common';
import { AiTaskRouter } from './routing/ai-task-router';
import { StructuredResponseParser } from './parser/structured-response-parser';
import { AiRequest } from './interfaces/ai-request.interface';

@Injectable()
export class AiService {
  constructor(
    private readonly taskRouter: AiTaskRouter,
    private readonly responseParser: StructuredResponseParser,
  ) {}

  /**
   * Primary entry point for AI content generation.
   * Dynamically routes tasks, runs execution policies, parses JSON, and validates Zod schemas.
   * Ensures output strictly flows through: AI Response -> JSON Extraction -> Schema Validation -> Safe Structured Output.
   */
  async generate<T>(request: AiRequest): Promise<T> {
    const { responseText, route } = await this.taskRouter.routeAndExecute(
      request.taskType,
      request.systemPrompt,
      request.userPrompt,
    );

    // AI Response -> JSON Extraction -> Schema Validation -> Safe Structured Output
    return this.responseParser.parseAndValidate<T>(
      responseText,
      route.responseSchema,
    );
  }
}
