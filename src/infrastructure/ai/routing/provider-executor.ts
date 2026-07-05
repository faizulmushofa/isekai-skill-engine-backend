import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { AiProvider } from '../interfaces/ai-provider.interface';
import { GeminiProvider } from '../providers/gemini.provider';
import { GroqProvider } from '../providers/groq.provider';
import { PromptGuardService } from '../guard/prompt-guard.service';
import { AiTaskRoute } from './ai-routing.config';
import { MockAiGenerator } from '../mock/mock-generator';
import { AiTaskType } from '../enums/ai-task-type.enum';

@Injectable()
export class ProviderExecutor {
  private readonly logger = new Logger(ProviderExecutor.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiProvider: GeminiProvider,
    private readonly groqProvider: GroqProvider,
    private readonly promptGuard: PromptGuardService,
    private readonly mockGenerator: MockAiGenerator,
  ) {}

  /**
   * Executes the prompt request using key rotation, retry strategy, and fallback failovers.
   */
  async execute(
    route: AiTaskRoute,
    systemPrompt: string,
    userPrompt: string,
    taskType?: AiTaskType,
  ): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    
    // 0. Anti-jailbreak: screen user input with Llama Guard
    await this.promptGuard.enforceOrThrow(userPrompt);

    try {
      // 1. Attempt main route execution
      return await this.executeWithRetryAndKeyRotation(route, systemPrompt, userPrompt);
    } catch (primaryError) {
      this.logger.warn(
        `Primary execution policy exhausted for '${route.provider}' (${route.model}). Error: ${primaryError.message}. Initiating fallbacks...`,
      );

      // 2. Fallback to backup routes in sequence
      if (route.fallbacks && route.fallbacks.length > 0) {
        for (const fallback of route.fallbacks) {
          const fallbackRoute: AiTaskRoute = {
            provider: fallback.provider,
            model: fallback.model,
            apiKeysEnv: fallback.apiKeysEnv || this.getDefaultKeysForProvider(fallback.provider),
            responseSchema: route.responseSchema,
            temperature: fallback.temperature ?? route.temperature,
            maxRetries: route.maxRetries,
          };

          try {
            this.logger.log(`Attempting fallback failover to '${fallback.provider}' (${fallback.model})...`);
            return await this.executeWithRetryAndKeyRotation(fallbackRoute, systemPrompt, userPrompt);
          } catch (fallbackError) {
            this.logger.warn(
              `Fallback provider '${fallback.provider}' (${fallback.model}) failover failed: ${fallbackError.message}`,
            );
          }
        }
      }

      // ── FAILSAFE MOCK ────────────────────────────────────────────────────
      // If a taskType was provided, return a realistic mock response instead
      // of crashing the request. This keeps the demo functional even when
      // API keys are exhausted or invalid.
      if (taskType) {
        this.logger.warn(
          `[ProviderExecutor] All live AI paths failed. Activating MockAiGenerator for task '${taskType}'.`,
        );
        const mockText = this.mockGenerator.generate(taskType, userPrompt);
        return {
          text: mockText,
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        };
      }

      throw new InternalServerErrorException(
        `All configured AI execution paths failed. Primary error: ${primaryError.message}`,
      );
    }
  }

  /**
   * Executes a specific route, rotating through multiple API keys and handling linear retries.
   */
  private async executeWithRetryAndKeyRotation(
    route: AiTaskRoute,
    systemPrompt: string,
    userPrompt: string,
  ): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const provider = this.resolveProvider(route.provider);
    const maxRetries = route.maxRetries ?? 1;

    // Loop through API Keys (Multiple API Keys support per task!)
    for (const keyEnvVar of route.apiKeysEnv) {
      const apiKey = this.configService.get<string>(keyEnvVar);
      if (!apiKey) {
        this.logger.warn(`API key environment variable '${keyEnvVar}' is not defined. Trying next key.`);
        continue;
      }

      // Execute with retries
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await provider.generate(systemPrompt, userPrompt, {
            model: route.model,
            apiKey,
            responseSchema: route.responseSchema,
            temperature: route.temperature,
          });
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          const errorMessage = lastError.message.toLowerCase();

          // Fast-fail for non-retryable errors (e.g. invalid model, invalid schema)
          const isNonRetryable = 
            errorMessage.includes('400') || 
            errorMessage.includes('404') || 
            errorMessage.includes('bad request') || 
            errorMessage.includes('not found') ||
            errorMessage.includes('invalid argument');

          if (isNonRetryable) {
             this.logger.error(`Non-retryable error encountered: ${lastError.message}. Aborting retries for this key.`);
             break; // Skip remaining retries for this key
          }

          this.logger.warn(
            `Attempt ${attempt}/${maxRetries} failed using key '${keyEnvVar}' for '${route.provider}' (${route.model}): ${lastError.message}`,
          );

          if (attempt < maxRetries) {
            // Exponential backoff: 2s, 4s, 8s, 16s
            const delayMs = Math.pow(2, attempt) * 1000;
            this.logger.warn(`Waiting ${delayMs}ms before next attempt (Exponential Backoff)...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
          }
        }
      }
    }

    throw new Error(
      `Failed to complete execution for provider '${route.provider}' (${route.model}) after exhausting all retries and keys.`,
    );
  }

  private resolveProvider(providerName: 'gemini' | 'groq'): AiProvider {
    switch (providerName) {
      case 'gemini':
        return this.geminiProvider;
      case 'groq':
        return this.groqProvider;
      default:
        throw new InternalServerErrorException(`AI Provider '${providerName}' tidak dikenali.`);
    }
  }

  private getDefaultKeysForProvider(provider: 'gemini' | 'groq'): string[] {
    switch (provider) {
      case 'gemini':
        return ['GEMINI_API_KEY'];
      case 'groq':
        return ['GROQ_API_KEY'];
    }
  }
}

