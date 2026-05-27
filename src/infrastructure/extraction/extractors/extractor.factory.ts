import { Injectable, BadRequestException } from '@nestjs/common';
import { TextExtractor } from '../interfaces/text-extractor.interface';
import { PdfExtractor } from './pdf.extractor';
import { TxtExtractor } from './txt.extractor';

@Injectable()
export class ExtractorFactory {
  private readonly extractors: TextExtractor[];

  constructor(
    private readonly pdfExtractor: PdfExtractor,
    private readonly txtExtractor: TxtExtractor,
  ) {
    this.extractors = [this.pdfExtractor, this.txtExtractor];
  }

  /**
   * Dynamically resolves the correct TextExtractor subclass matching the file's MIME type.
   */
  getExtractor(mimeType: string): TextExtractor {
    const extractor = this.extractors.find((e) => e.supports(mimeType));
    if (!extractor) {
      throw new BadRequestException(
        `Tipe media berkas '${mimeType}' tidak didukung oleh Content Extraction Infrastructure.`,
      );
    }
    return extractor;
  }
}
