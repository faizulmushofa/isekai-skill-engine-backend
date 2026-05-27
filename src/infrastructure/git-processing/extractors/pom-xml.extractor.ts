import { Injectable } from '@nestjs/common';
import { ManifestExtractor } from './manifest-extractor.interface';

@Injectable()
export class PomXmlExtractor implements ManifestExtractor {
  supports(fileName: string): boolean {
    return fileName.toLowerCase() === 'pom.xml';
  }

  extract(content: string): { manifest: any; dependencies: string[] } {
    const dependencies: string[] = [];
    
    try {
      const depRegex = /<dependency>([\s\S]*?)<\/dependency>/g;
      const artifactIdRegex = /<artifactId>(.*?)<\/artifactId>/;
      let match;
      
      while ((match = depRegex.exec(content)) !== null) {
        const artifactMatch = artifactIdRegex.exec(match[1]);
        if (artifactMatch && artifactMatch[1]) {
          dependencies.push(artifactMatch[1].trim());
        }
      }
    } catch (e) {
      // Abaikan error regex
    }

    return { manifest: content, dependencies };
  }
}
