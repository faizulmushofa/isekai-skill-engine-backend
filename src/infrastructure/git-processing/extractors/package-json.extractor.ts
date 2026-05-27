import { Injectable } from '@nestjs/common';
import { ManifestExtractor } from './manifest-extractor.interface';

@Injectable()
export class PackageJsonExtractor implements ManifestExtractor {
  supports(fileName: string): boolean {
    return fileName.toLowerCase() === 'package.json';
  }

  extract(content: string): { manifest: any; dependencies: string[] } {
    const dependencies: string[] = [];
    let manifest: any = {};

    try {
      manifest = JSON.parse(content);
      
      if (manifest.dependencies) {
        Object.keys(manifest.dependencies).forEach((dep) => dependencies.push(dep));
      }
      if (manifest.devDependencies) {
        Object.keys(manifest.devDependencies).forEach((dep) => dependencies.push(dep));
      }
    } catch (e) {
      // Abaikan error parsing dan kembalikan manifes kosong
    }

    return { manifest, dependencies };
  }
}
