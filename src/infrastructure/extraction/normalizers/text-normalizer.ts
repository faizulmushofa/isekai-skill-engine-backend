import { Injectable } from '@nestjs/common';

@Injectable()
export class TextNormalizer {
  /**
   * Normalizes document text into clean, token-efficient structure.
   * Collapses multiple whitespaces, strips carriage returns, and collapses consecutive blank lines.
   */
  normalize(text: string): string {
    if (!text) return '';

    return text
      .replace(/\r\n/g, '\n')                   // Normalize all newlines to LF
      .replace(/\r/g, '\n')
      .replace(/[^\x20-\x7E\n\t]/g, '')         // Strip non-printable ASCII control chars (excluding spaces, tabs, newlines)
      .replace(/[ \t]+/g, ' ')                  // Collapse multiple spaces and horizontal tabs into one space
      .replace(/^[ \t]+/gm, '')                 // Trim leading spaces from lines
      .replace(/[ \t]+$/gm, '')                 // Trim trailing spaces from lines
      .replace(/\n\s*\n+/g, '\n\n')             // Collapse consecutive blank lines into exactly one blank line
      .trim();
  }
}
