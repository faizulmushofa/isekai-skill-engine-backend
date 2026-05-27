import { Injectable } from '@nestjs/common';
import { ManifestExtractor } from './manifest-extractor.interface';

@Injectable()
export class GoModExtractor implements ManifestExtractor {
  supports(fileName: string): boolean {
    return fileName.toLowerCase() === 'go.mod';
  }

  extract(content: string): { manifest: any; dependencies: string[] } {
    const dependencies: string[] = [];

    try {
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('require') && !trimmed.includes('(')) {
          const parts = trimmed.split(/\s+/);
          if (parts.length >= 2) {
            dependencies.push(parts[1]);
          }
        } else if (trimmed && !trimmed.startsWith('module') && !trimmed.startsWith('go') && !trimmed.startsWith('require') && !trimmed.startsWith('exclude') && !trimmed.startsWith('replace') && trimmed !== '(' && trimmed !== ')') {
          const parts = trimmed.split(/\s+/);
          if (parts.length > 0) {
            dependencies.push(parts[0]);
          }
        }
      }
    } catch (e) {
      // Abaikan error parsing
    }

    return { manifest: content, dependencies };
  }
}
