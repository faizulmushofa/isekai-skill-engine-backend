import { ExtractionSourceType } from '../enums/extraction-source-type.enum';

export interface ExtractedContent {
  rawText: string;
  normalizedText: string;
  metadata: {
    fileName: string;
    mimeType: string;
    fileSize: number;
    extractedAt: Date;
    additionalInfo?: Record<string, any>;
  };
  sourceType: ExtractionSourceType;
}
