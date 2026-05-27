import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { AI_TASK_ROUTES, AiTaskRoute } from './ai-routing.config';
import { ProviderExecutor } from './provider-executor';

@Injectable()
export class AiTaskRouter {
  constructor(private readonly executor: ProviderExecutor) {}

  /**
   * Matches an AiTaskType to its config route and delegates execution to ProviderExecutor.
   * Returns the raw output string and the resolved task route details.
   */
  async routeAndExecute(
    taskType: AiTaskType,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ responseText: string; route: AiTaskRoute }> {
    const route = AI_TASK_ROUTES[taskType];
    if (!route) {
      throw new InternalServerErrorException(
        `Konfigurasi perutean tidak ditemukan untuk tipe tugas: "${taskType}"`,
      );
    }

    const responseText = await this.executor.execute(route, systemPrompt, userPrompt);
    return { responseText, route };
  }
}
