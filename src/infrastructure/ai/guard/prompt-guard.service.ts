import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '../../config/config.service';

export interface PromptGuardResult {
  isSafe: boolean;
  category?: string;
  rawResponse: string;
}

@Injectable()
export class PromptGuardService {
  private readonly logger = new Logger(PromptGuardService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Screens user input for prompt injection and jailbreak attempts
   * using Meta's Llama Guard 3 (8B) model via Groq API.
   *
   * Llama Guard classifies content as "safe" or "unsafe" with category codes:
   * S1: Violent Crimes, S2: Non-Violent Crimes, S3: Sex-Related Crimes,
   * S4: Child Sexual Exploitation, S5: Defamation, S6: Specialized Advice,
   * S7: Privacy, S8: Intellectual Property, S9: Indiscriminate Weapons,
   * S10: Hate, S11: Suicide & Self-Harm, S12: Sexual Content, S13: Elections,
   * S14: Code Interpreter Abuse
   */
  async classify(userPrompt: string): Promise<PromptGuardResult> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'GROQ_API_KEY tidak dikonfigurasi — prompt guard dilewati.',
      );
      return { isSafe: true, rawResponse: 'SKIPPED: No API key' };
    }

    try {
      const response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-prompt-guard-2-22m',
            messages: [
              {
                role: 'user',
                content: userPrompt,
              },
            ],
            temperature: 0.0,
            max_tokens: 100,
          }),
        },
      );

      if (!response.ok) {
        this.logger.warn(
          `Prompt Guard HTTP error ${response.status} — guard dilewati untuk menghindari blocking.`,
        );
        return {
          isSafe: true,
          rawResponse: `HTTP_ERROR: ${response.status}`,
        };
      }

      const data = await response.json();
      const content: string =
        data?.choices?.[0]?.message?.content?.trim() ?? '';

      // Support Llama Prompt Guard 2-22m returning a float risk score
      const parsedScore = parseFloat(content);
      let isSafe = false;
      let category: string | undefined = undefined;

      if (!isNaN(parsedScore)) {
        // If score is a float, safe threshold is < 0.5 (e.g. low probability of jailbreak/injection)
        isSafe = parsedScore < 0.5;
        if (!isSafe) {
          category = `risk_score_${parsedScore}`;
        }
      } else {
        // Llama Guard returns "safe" or "unsafe\nS<category>"
        // Llama Prompt Guard 2-22m/8B returns "benign", "injection", or "jailbreak"
        const normalized = content.toLowerCase();
        isSafe = normalized.includes('benign') || normalized.startsWith('safe');
        
        if (!isSafe) {
          if (normalized.includes('jailbreak')) {
            category = 'jailbreak';
          } else if (normalized.includes('injection')) {
            category = 'injection';
          } else {
            category = content.split('\n').slice(1).join(', ').trim() || content.trim() || 'unknown';
          }
        }
      }

      if (!isSafe) {
        this.logger.warn(
          `🛡️ Prompt Guard BLOCKED — kategori: ${category} | input: "${userPrompt.substring(0, 80)}..."`,
        );
      }

      return { isSafe, category, rawResponse: content };
    } catch (error) {
      // Fail-open: jangan block user jika guard down
      this.logger.error(
        `Prompt Guard error: ${error instanceof Error ? error.message : error} — guard dilewati.`,
      );
      return { isSafe: true, rawResponse: `ERROR: ${error}` };
    }
  }

  /**
   * Convenience method: classify and throw if unsafe.
   */
  async enforceOrThrow(userPrompt: string): Promise<void> {
    const result = await this.classify(userPrompt);
    if (!result.isSafe) {
      throw new ForbiddenException(
        `Input ditolak oleh sistem keamanan AI. Kategori: ${result.category}`,
      );
    }
  }
}
