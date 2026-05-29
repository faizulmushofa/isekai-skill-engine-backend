import { Module } from '@nestjs/common';
import { TextNormalizer } from './normalizers/text-normalizer';
import { PdfExtractor } from './extractors/pdf.extractor';
import { TxtExtractor } from './extractors/txt.extractor';
import { ExtractorFactory } from './extractors/extractor.factory';
import { ExtractionService } from './extraction.service';
import { DeterministicExtractionService } from './deterministic-extraction.service';

@Module({
  providers: [
    TextNormalizer,
    PdfExtractor,
    TxtExtractor,
    ExtractorFactory,
    ExtractionService,
    DeterministicExtractionService,
  ],
  exports: [ExtractionService, DeterministicExtractionService],
})
export class ExtractionModule {}
