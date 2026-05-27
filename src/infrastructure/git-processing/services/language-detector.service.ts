import { Injectable } from '@nestjs/common';
import { RepoContext } from '../interfaces/git-processing.interfaces';

@Injectable()
export class LanguageDetectorService {
  // Pemetaan kunci manifes (dalam camelCase) ke Bahasa Pemrograman
  private readonly manifestLanguageMap: Record<string, string> = {
    packageJson: 'JS/TS',
    pomXml: 'Java',
    goMod: 'Golang',
    requirementsTxt: 'Python',
  };

  // Pemetaan ekstensi berkas ke Bahasa Pemrograman
  private readonly extensionLanguageMap: Record<string, string> = {
    ts: 'JS/TS',
    js: 'JS/TS',
    tsx: 'JS/TS',
    jsx: 'JS/TS',
    java: 'Java',
    go: 'Golang',
    py: 'Python',
    rs: 'Rust',
    cpp: 'C++',
    cc: 'C++',
    h: 'C++',
    php: 'PHP',
    rb: 'Ruby',
  };

  /**
   * Mendeteksi bahasa pemrograman dari berkas manifest atau ekstensi berkas secara deklaratif & dinamis.
   */
  detectLanguages(context: RepoContext): string[] {
    const languages = new Set<string>();
    const manifests = context.manifests || {};

    // 1. Deteksi berbasis berkas manifest menggunakan pemetaan kamus
    for (const [manifestKey, langName] of Object.entries(this.manifestLanguageMap)) {
      if (manifests[manifestKey]) {
        languages.add(langName);
      }
    }

    // 2. Fallback deteksi berbasis ekstensi pohon berkas jika tidak ada berkas manifest
    if (languages.size === 0 && context.fileTree && context.fileTree.length > 0) {
      for (const file of context.fileTree) {
        const ext = file.split('.').pop()?.toLowerCase();
        if (ext && this.extensionLanguageMap[ext]) {
          languages.add(this.extensionLanguageMap[ext]);
        }
      }
    }

    return Array.from(languages);
  }
}
