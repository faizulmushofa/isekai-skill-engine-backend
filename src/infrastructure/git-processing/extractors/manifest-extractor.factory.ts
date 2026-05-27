import { Injectable } from '@nestjs/common';
import { ManifestExtractor } from './manifest-extractor.interface';
import { PackageJsonExtractor } from './package-json.extractor';
import { PomXmlExtractor } from './pom-xml.extractor';
import { GoModExtractor } from './go-mod.extractor';
import { RequirementsTxtExtractor } from './requirements-txt.extractor';

@Injectable()
export class ManifestExtractorFactory {
  private readonly extractors: ManifestExtractor[];

  constructor(
    packageJson: PackageJsonExtractor,
    pomXml: PomXmlExtractor,
    goMod: GoModExtractor,
    requirementsTxt: RequirementsTxtExtractor,
  ) {
    this.extractors = [packageJson, pomXml, goMod, requirementsTxt];
  }

  /**
   * Menemukan ekstraktor manifest berkas yang cocok berdasarkan nama berkas.
   */
  getExtractor(fileName: string): ManifestExtractor | undefined {
    return this.extractors.find((ext) => ext.supports(fileName));
  }
}
