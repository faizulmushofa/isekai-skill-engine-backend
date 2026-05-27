import { Injectable } from '@nestjs/common';
import { AiProvider } from '../interfaces/ai-provider.interface';

@Injectable()
export class GeminiProvider extends AiProvider {
  /**
   * Generates content using Google Gemini API.
   * Leverages clean system instruction injection and configures structured JSON output dynamically.
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
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

    // The exact JSON structure is now baked directly into the systemPrompt.
    const finalSystemPrompt = systemPrompt;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: finalSystemPrompt }] },
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: config.temperature,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini HTTP API error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const contentText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!contentText) {
      throw new Error('Gemini API returned an empty or invalid response candidate.');
    }

    return contentText;
  }
}
