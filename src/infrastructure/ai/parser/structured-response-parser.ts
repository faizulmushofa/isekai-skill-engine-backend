import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { z } from 'zod';

@Injectable()
export class StructuredResponseParser {
  private readonly logger = new Logger(StructuredResponseParser.name);

  /**
   * Sanitizes markdown markers, extracts raw JSON text, and runs Zod schema validation.
   * If validation fails on array items, attempts to recover by filtering out incomplete entries.
   */
  parseAndValidate<T>(response: string, schema: z.ZodType<T>): T {
    const cleanedText = this.cleanJsonResponse(response);

    try {
      const parsedJson = JSON.parse(cleanedText);

      // First attempt: direct validation
      const firstAttempt = schema.safeParse(parsedJson);
      if (firstAttempt.success) {
        return firstAttempt.data;
      }

      // Second attempt: sanitize array fields by removing incomplete items
      this.logger.warn(
        `First validation failed, attempting array sanitization: ${JSON.stringify(firstAttempt.error.format())}`,
      );
      const sanitized = this.sanitizeArrayFields(parsedJson);
      const secondAttempt = schema.safeParse(sanitized);

      if (secondAttempt.success) {
        this.logger.log('Validation succeeded after array sanitization.');
        return secondAttempt.data;
      }

      this.logger.error(`AI Raw JSON parsed: ${JSON.stringify(sanitized)}`);
      throw new BadRequestException(
        `AI Response JSON schema validation failed: ${JSON.stringify(secondAttempt.error.format())}`,
      );
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

  /**
   * Iterates over all top-level array fields in the parsed JSON.
   * Removes any item from the array that has undefined/null required string fields.
   * This recovers from LLMs occasionally dropping fields on individual array entries.
   */
  private sanitizeArrayFields(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };

    for (const key of Object.keys(sanitized)) {
      const value = sanitized[key];
      if (!Array.isArray(value)) continue;

      const originalLength = value.length;
      sanitized[key] = value.filter((item) => {
        if (typeof item !== 'object' || item === null) return true;
        // Remove items where any value is explicitly undefined or null
        const values = Object.values(item as Record<string, unknown>);
        return values.every((v) => v !== undefined && v !== null);
      });

      const removed = originalLength - (sanitized[key] as unknown[]).length;
      if (removed > 0) {
        this.logger.warn(
          `Sanitized array "${key}": removed ${removed} incomplete item(s) out of ${originalLength}.`,
        );
      }
    }

    return sanitized;
  }
}
