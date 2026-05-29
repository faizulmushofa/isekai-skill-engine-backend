import { Injectable } from '@nestjs/common';
import { AiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class GroqProvider extends AiProvider {
  /**
   * Generates content using Groq API (OpenAI compatible endpoint).
   */
  async generate(
    systemPrompt: string,
    userPrompt: string,
    config: {
      model: string;
      apiKey: string;
      responseSchema: any;
      temperature: number;
    },
  ): Promise<{ text: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    // Groq requires standard OpenAI chat completion payload.
    // If responseSchema is provided, we use json_object response format.
    // The exact JSON structure is now baked directly into the systemPrompt.
    const finalSystemPrompt = systemPrompt;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: finalSystemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: config.temperature,
        response_format: config.responseSchema ? { type: 'json_object' } : undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq HTTP API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const contentText = data?.choices?.[0]?.message?.content;

    if (!contentText) {
      throw new Error('Groq API returned an empty or invalid response candidate.');
    }

    const usage = data?.usage || {};
    return {
      text: contentText,
      usage: {
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
      }
    };
  }
}
