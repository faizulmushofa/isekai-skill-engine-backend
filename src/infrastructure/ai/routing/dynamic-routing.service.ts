import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { AI_TASK_ROUTES, AiTaskRoute } from './ai-routing.config';

@Injectable()
export class DynamicRoutingService implements OnModuleInit {
  private readonly logger = new Logger(DynamicRoutingService.name);
  
  // In-memory cache for fast routing overrides
  private dbOverrides: Map<AiTaskType, Partial<AiTaskRoute>> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.loadOverridesFromDb();
  }

  /**
   * Load overrides from DB into memory
   */
  async loadOverridesFromDb() {
    try {
      const configs = await this.prisma.aiTaskConfig.findMany();
      this.dbOverrides.clear();
      for (const config of configs) {
        const override: Partial<AiTaskRoute> = {
          provider: config.provider as 'gemini' | 'groq',
          model: config.model,
          temperature: config.temperature,
          maxDailyTokens: config.maxDailyTokens,
          maxMonthlyTokens: config.maxMonthlyTokens,
        };

        if (config.fallbackProvider && config.fallbackModel) {
          override.fallbacks = [
            {
              provider: config.fallbackProvider as 'gemini' | 'groq',
              model: config.fallbackModel,
              apiKeysEnv: config.fallbackProvider === 'gemini' ? ['GEMINI_API_KEY'] : ['GROQ_API_KEY'],
            },
          ];
        }

        this.dbOverrides.set(config.taskType as AiTaskType, override);
      }
      this.logger.log(`Loaded ${configs.length} dynamic AI task overrides from database.`);
    } catch (error) {
      this.logger.error(`Failed to load AI task configs from database: ${error.message}`);
    }
  }

  /**
   * Get the route configuration for a specific task type.
   * Merges static fallback with dynamic override.
   */
  getRoute(taskType: AiTaskType): AiTaskRoute | undefined {
    const staticRoute = AI_TASK_ROUTES[taskType];
    if (!staticRoute) return undefined;

    const override = this.dbOverrides.get(taskType);
    if (!override) return staticRoute;

    // Merge static route with DB override
    // Note: API keys env vars depend on the provider, so we must adjust it if provider changes
    let apiKeysEnv = staticRoute.apiKeysEnv;
    if (override.provider && override.provider !== staticRoute.provider) {
       apiKeysEnv = override.provider === 'gemini' ? ['GEMINI_API_KEY'] : ['GROQ_API_KEY'];
    }

    return {
      ...staticRoute,
      ...override,
      apiKeysEnv, // Apply adjusted api key envs based on provider
    };
  }

  /**
   * Get all active configurations (static + overrides)
   */
  getAllRoutes(): Record<string, AiTaskRoute> {
    const routes: Record<string, AiTaskRoute> = {};
    for (const task of Object.values(AiTaskType)) {
      const route = this.getRoute(task as AiTaskType);
      if (route) {
        routes[task] = route;
      }
    }
    return routes;
  }

  /**
   * Upsert a configuration override in DB and memory
   */
  async updateRouteOverride(
    taskType: AiTaskType,
    provider: 'gemini' | 'groq',
    model: string,
    temperature: number,
    fallbackProvider?: 'gemini' | 'groq',
    fallbackModel?: string,
    maxDailyTokens?: number,
    maxMonthlyTokens?: number
  ) {
    // Validate if the taskType exists in base config
    if (!AI_TASK_ROUTES[taskType]) {
      throw new Error(`Task Type ${taskType} does not exist in static configurations.`);
    }

    const maxTokens = maxDailyTokens !== undefined ? maxDailyTokens : 100000;
    const maxMonthly = maxMonthlyTokens !== undefined ? maxMonthlyTokens : 3000000;

    await this.prisma.aiTaskConfig.upsert({
      where: { taskType },
      update: { provider, model, temperature, fallbackProvider, fallbackModel, maxDailyTokens: maxTokens, maxMonthlyTokens: maxMonthly },
      create: { taskType, provider, model, temperature, fallbackProvider, fallbackModel, maxDailyTokens: maxTokens, maxMonthlyTokens: maxMonthly },
    });

    // Update memory
    const override: Partial<AiTaskRoute> = { provider, model, temperature, maxDailyTokens: maxTokens, maxMonthlyTokens: maxMonthly };
    if (fallbackProvider && fallbackModel) {
      override.fallbacks = [
        {
          provider: fallbackProvider,
          model: fallbackModel,
          apiKeysEnv: fallbackProvider === 'gemini' ? ['GEMINI_API_KEY'] : ['GROQ_API_KEY'],
        },
      ];
    }

    this.dbOverrides.set(taskType, override);
    this.logger.log(`Updated routing override for ${taskType}`);
  }
}
