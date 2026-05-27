import { ExtractionSourceType } from '../enums/extraction-source-type.enum';

export const SUPPORTED_MIME_TYPES: Record<string, ExtractionSourceType> = {
  'application/pdf': ExtractionSourceType.PDF,
  'text/plain': ExtractionSourceType.TXT,
  'text/markdown': ExtractionSourceType.MARKDOWN,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ExtractionSourceType.DOCX,
};
