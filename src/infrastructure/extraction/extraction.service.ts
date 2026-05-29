import { Injectable, BadRequestException } from '@nestjs/common';
import { ExtractorFactory } from './extractors/extractor.factory';
import { ExtractedContent } from './interfaces/extracted-content.interface';

@Injectable()
export class ExtractionService {
  constructor(private readonly extractorFactory: ExtractorFactory) {}

  /**
   * CENTRALIZED INGESTION ENTRY POINT.
   * Resolves the correct file extractor dynamically based on MIME type,
   * parses the target document file, normalizes the text, and compiles ExtractedContent metadata.
   */
  async extractContent(filePath: string, mimeType: string): Promise<ExtractedContent> {
    if (!filePath || !filePath.trim()) {
      throw new BadRequestException('Path berkas fisik wajib diisi.');
    }
    if (!mimeType || !mimeType.trim()) {
      throw new BadRequestException('Tipe media (MIME type) berkas wajib diisi.');
    }

    const extractor = this.extractorFactory.getExtractor(mimeType.toLowerCase().trim());
    return extractor.extract(filePath);
  }
}
