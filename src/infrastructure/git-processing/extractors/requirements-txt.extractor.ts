import { Injectable } from '@nestjs/common';
import { ManifestExtractor } from './manifest-extractor.interface';

@Injectable()
export class RequirementsTxtExtractor implements ManifestExtractor {
  supports(fileName: string): boolean {
    return fileName.toLowerCase() === 'requirements.txt';
  }

  extract(content: string): { manifest: any; dependencies: string[] } {
    const dependencies: string[] = [];

    try {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const parts = trimmed.split(/[==|>=|<=|>|<]/);
          if (parts.length > 0 && parts[0].trim()) {
            dependencies.push(parts[0].trim());
          }
        }
      }
    } catch (e) {
      // Abaikan error parsing
    }

    return { manifest: content, dependencies };
  }
}
