import { Injectable, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TextExtractor } from '../interfaces/text-extractor.interface';
import { ExtractedContent } from '../interfaces/extracted-content.interface';
import { ExtractionSourceType } from '../enums/extraction-source-type.enum';
import { TextNormalizer } from '../normalizers/text-normalizer';

@Injectable()
export class TxtExtractor implements TextExtractor {
  constructor(private readonly normalizer: TextNormalizer) {}

  supports(mimeType: string): boolean {
    return mimeType === 'text/plain' || mimeType === 'text/markdown';
  }

  async extract(filePath: string): Promise<ExtractedContent> {
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`Berkas teks di jalur '${filePath}' tidak ditemukan.`);
    }

    const stat = fs.statSync(filePath);
    const fileName = path.basename(filePath);
    const mimeType = fileName.endsWith('.md') ? 'text/markdown' : 'text/plain';
    const sourceType = fileName.endsWith('.md') ? ExtractionSourceType.MARKDOWN : ExtractionSourceType.TXT;

    const rawBuffer = await fs.promises.readFile(filePath);
    const rawText = rawBuffer.toString('utf8');
    const normalizedText = this.normalizer.normalize(rawText);

    return {
      rawText,
      normalizedText,
      metadata: {
        fileName,
        mimeType,
        fileSize: stat.size,
        extractedAt: new Date(),
      },
      sourceType,
    };
  }
}
