import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiTaskRouter } from './routing/ai-task-router';
import { ProviderExecutor } from './routing/provider-executor';
import { StructuredResponseParser } from './parser/structured-response-parser';
import { GeminiProvider } from './providers/gemini.provider';
import { GroqProvider } from './providers/groq.provider';
import { ConfigModule } from '../config/config.module';
import { PromptGuardService } from './guard/prompt-guard.service';
import { DynamicRoutingService } from './routing/dynamic-routing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MockAiGenerator } from './mock/mock-generator';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [
    AiService,
    AiTaskRouter,
    ProviderExecutor,
    StructuredResponseParser,
    GeminiProvider,
    GroqProvider,
    PromptGuardService,
    DynamicRoutingService,
    MockAiGenerator,
  ],
  exports: [AiService, DynamicRoutingService],
})
export class AiModule {}
