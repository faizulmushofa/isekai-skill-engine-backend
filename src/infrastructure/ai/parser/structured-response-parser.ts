import { Injectable, BadRequestException } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class StructuredResponseParser {
  /**
   * Sanitizes markdown markers, extracts raw JSON text, and runs Zod schema validation.
   * Yields 100% type-safe structured data.
   */
  parseAndValidate<T>(response: string, schema: z.ZodType<T>): T {
    const cleanedText = this.cleanJsonResponse(response);

    try {
      const parsedJson = JSON.parse(cleanedText);
      const validationResult = schema.safeParse(parsedJson);

      if (!validationResult.success) {
        throw new BadRequestException(
          `AI Response JSON schema validation failed: ${JSON.stringify(validationResult.error.format())}`,
        );
      }

      return validationResult.data;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to parse AI response as valid JSON. Cleaned response: "${cleanedText}". Error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Strips any markdown code block wrappers (e.g. ```json ... ``` or ``` ... ```).
   */
  private cleanJsonResponse(response: string): string {
    if (!response) return '{}';
    let cleaned = response.trim();

    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\s*\n?/, '');
      cleaned = cleaned.replace(/\n?\s*```$/, '');
    }

    return cleaned.trim();
  }
}
