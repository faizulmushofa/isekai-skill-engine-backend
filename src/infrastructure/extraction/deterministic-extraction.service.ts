import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeterministicRule } from '@prisma/client';

export interface DeterministicResult {
  languages: Set<string>;
  skills: Set<string>;
  signals: string[];
}

@Injectable()
export class DeterministicExtractionService {
  private readonly logger = new Logger(DeterministicExtractionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Evaluates repository signals against deterministic rules stored in the database.
   */
  async extract(fileStructure: string[], dependencies: string[]): Promise<DeterministicResult> {
    const rules = await this.prisma.deterministicRule.findMany();
    
    const result: DeterministicResult = {
      languages: new Set(),
      skills: new Set(),
      signals: [],
    };

    if (rules.length === 0) {
      this.logger.debug('No deterministic rules found in database.');
      return result;
    }

    for (const rule of rules) {
      let matched = false;

      // 1. Check File Name Pattern
      if (rule.fileNamePattern && fileStructure.length > 0) {
        const regex = new RegExp(rule.fileNamePattern, 'i');
        for (const file of fileStructure) {
          if (regex.test(file)) {
            matched = true;
            result.signals.push(`Rule matched file: ${file} (Pattern: ${rule.fileNamePattern})`);
            break;
          }
        }
      }

      // 2. Check Dependency/Content Pattern
      if (!matched && rule.fileContentPattern && dependencies.length > 0) {
        const regex = new RegExp(rule.fileContentPattern, 'i');
        for (const dep of dependencies) {
          if (regex.test(dep)) {
            matched = true;
            result.signals.push(`Rule matched dependency: ${dep} (Pattern: ${rule.fileContentPattern})`);
            break;
          }
        }
      }

      // 3. Apply Findings
      if (matched) {
        if (rule.detectedLanguage) {
          result.languages.add(rule.detectedLanguage);
        }
        if (rule.detectedSkill) {
          result.skills.add(rule.detectedSkill);
        }
      }
    }

    this.logger.log(`Deterministic extraction found ${result.languages.size} languages and ${result.skills.size} skills.`);
    return result;
  }
}
