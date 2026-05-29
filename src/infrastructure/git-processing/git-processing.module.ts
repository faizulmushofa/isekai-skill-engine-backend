import { Module } from '@nestjs/common';
import { GitCoreService } from './services/git-core.service';
import { ContextExtractorService } from './services/context-extractor.service';
import { LanguageDetectorService } from './services/language-detector.service';
import { IntelligenceDetectorService } from './services/intelligence-detector.service';
import { RuleEngineService } from './services/rule-engine.service';
import { SignalComputationService } from './services/signal-computation.service';
import { GitProcessingService } from './git-processing.service';

// Extractors
import { PackageJsonExtractor } from './extractors/package-json.extractor';
import { PomXmlExtractor } from './extractors/pom-xml.extractor';
import { GoModExtractor } from './extractors/go-mod.extractor';
import { RequirementsTxtExtractor } from './extractors/requirements-txt.extractor';
import { ManifestExtractorFactory } from './extractors/manifest-extractor.factory';

@Module({
  providers: [
    // Services
    GitCoreService,
    ContextExtractorService,
    LanguageDetectorService,
    IntelligenceDetectorService,
    RuleEngineService,
    SignalComputationService,
    GitProcessingService,

    // Extractors Strategy Pattern
    PackageJsonExtractor,
    PomXmlExtractor,
    GoModExtractor,
    RequirementsTxtExtractor,
    ManifestExtractorFactory,
  ],
  exports: [GitProcessingService],
})
export class GitProcessingModule {}
