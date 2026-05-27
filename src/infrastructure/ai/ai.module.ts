import { Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { AiService } from './ai.service';
import { GeminiProvider } from './providers/gemini.provider';
import { StructuredResponseParser } from './parser/structured-response-parser';
import { ProviderExecutor } from './routing/provider-executor';
import { AiTaskRouter } from './routing/ai-task-router';

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiProvider,
    StructuredResponseParser,
    ProviderExecutor,
    AiTaskRouter,
    AiService,
  ],
  exports: [AiService],
})
export class AiModule {}
