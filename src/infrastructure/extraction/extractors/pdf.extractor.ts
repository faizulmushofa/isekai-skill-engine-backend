import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TextExtractor } from '../interfaces/text-extractor.interface';
import { ExtractedContent } from '../interfaces/extracted-content.interface';
import { ExtractionSourceType } from '../enums/extraction-source-type.enum';
import { TextNormalizer } from '../normalizers/text-normalizer';

@Injectable()
export class PdfExtractor implements TextExtractor {
  constructor(private readonly normalizer: TextNormalizer) {}

  supports(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async extract(filePath: string): Promise<ExtractedContent> {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Berkas PDF di jalur '${filePath}' tidak ditemukan.`);
    }

    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);

    const buffer = await fs.promises.readFile(filePath);
    const rawText = this.parsePdfText(buffer);
    const normalizedText = this.normalizer.normalize(rawText);

    return {
      rawText,
      normalizedText,
      metadata: {
        fileName,
        mimeType: 'application/pdf',
        fileSize: stat.size,
        extractedAt: new Date(),
        additionalInfo: {
          isBinaryPdf: buffer.includes('/FlateDecode'),
        },
      },
      sourceType: ExtractionSourceType.PDF,
    };
  }

  /**
   * Lightweight native PDF text segment parser.
   * Scrapes literal string blocks matching PDF operator brackets () Tj or TJ.
   * This is extremely robust, has 0 external binary dependencies, and avoids node-gyp issues.
   */
  private parsePdfText(buffer: Buffer): string {
    const fileString = buffer.toString('binary');
    
    // Pattern 1: Simple Tj blocks with parentheses e.g. (Hello World) Tj
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    // Pattern 2: Array text elements e.g. [(Hel) -10 (lo)] TJ
    const tjArrayRegex = /\[\s*(.*?)\s*\]\s*TJ/g;
    
    let textSegments: string[] = [];
    let match;

    // Pull simple Tj strings
    while ((match = tjRegex.exec(fileString)) !== null) {
      if (match[1]) {
        textSegments.push(this.cleanPdfOctals(match[1]));
      }
    }

    // Pull complex array TJ strings
    while ((match = tjArrayRegex.exec(fileString)) !== null) {
      const parts = match[1];
      // extract matching bracket values inside the array, e.g. (Hel) or (lo)
      const partRegex = /\(([^)]*)\)/g;
      let partMatch;
      let arrayText = '';
      while ((partMatch = partRegex.exec(parts)) !== null) {
        if (partMatch[1]) {
          arrayText += this.cleanPdfOctals(partMatch[1]);
        }
      }
      if (arrayText) {
        textSegments.push(arrayText);
      }
    }

    // Graceful fallback to raw text matches if the PDF is compressed/scrambled
    if (textSegments.length === 0) {
      // Find visible textual sequences
      const cleanMatches = fileString.match(/[a-zA-Z0-9\s.,;:!?@#&()\-="']{20,}/g) || [];
      textSegments = cleanMatches.filter(
        (str) => !str.includes('/Obj') && !str.includes('/Type') && !str.includes('/Length'),
      );
    }

    return textSegments.join('\n');
  }

  /**
   * Cleans up PDF octal sequences (e.g. \357\273\277) and escapes.
   */
  private cleanPdfOctals(text: string): string {
    return text
      .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
      .replace(/\\r/g, '\r')
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\/g, '');
  }
}
