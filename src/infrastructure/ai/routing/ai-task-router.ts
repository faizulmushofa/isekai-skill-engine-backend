import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { AiTaskRoute } from './ai-routing.config';
import { ProviderExecutor } from './provider-executor';
import { DynamicRoutingService } from './dynamic-routing.service';

@Injectable()
export class AiTaskRouter {
  constructor(
    private readonly executor: ProviderExecutor,
    private readonly dynamicRouting: DynamicRoutingService,
  ) {}

  getRoute(taskType: AiTaskType): AiTaskRoute | undefined {
    return this.dynamicRouting.getRoute(taskType);
  }

  /**
   * Matches an AiTaskType to its config route and delegates execution to ProviderExecutor.
   * Returns the raw output string and the resolved task route details.
   */
  async routeAndExecute(
    taskType: AiTaskType,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ responseText: string; route: AiTaskRoute; usage: any }> {
    const route = this.dynamicRouting.getRoute(taskType);
    if (!route) {
      throw new InternalServerErrorException(
        `Konfigurasi perutean tidak ditemukan untuk tipe tugas: "${taskType}"`,
      );
    }

    const { text, usage } = await this.executor.execute(route, systemPrompt, userPrompt);
    return { responseText: text, route, usage };
  }
}
