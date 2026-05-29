import { ExtractedContent } from './extracted-content.interface';

export abstract class TextExtractor {
  /**
   * Evaluates if this specific extractor supports the target file's MIME type.
   */
  abstract supports(mimeType: string): boolean;

  /**
   * Parses the target document file and compiles raw and structured ExtractedContent.
   */
  abstract extract(filePath: string): Promise<ExtractedContent>;
}
