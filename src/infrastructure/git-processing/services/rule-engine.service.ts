import { Injectable } from '@nestjs/common';
import { RuleSignal } from '../interfaces/git-processing.interfaces';

@Injectable()
export class RuleEngineService {
  /**
   * Pintu masuk utama deteksi sinyal mentah.
   * Hanya mengekstrak RuleSignal mentah tanpa melakukan agregasi atau penyaringan bobot.
   */
  extractSignals(filesChanged: string[], rawDiff: string): RuleSignal[] {
    const ruleSignals: RuleSignal[] = [];

    // 1. Ekstraksi Sinyal dari Jalur Berkas yang Berubah (File Path Matching)
    for (const filePath of filesChanged) {
      const normalizedPath = filePath.toLowerCase().replace(/\\/g, '/');

      if (normalizedPath.includes('auth')) {
        ruleSignals.push({
          skill: 'Authentication Skill',
          confidence: 0.85,
          reason: `Detected 'auth' in modified file path: ${filePath}`,
          filePath,
          matchType: 'path',
        });
      }

      if (normalizedPath.includes('jwt')) {
        ruleSignals.push({
          skill: 'Security Skill',
          confidence: 0.9,
          reason: `Detected 'jwt' in modified file path: ${filePath}`,
          filePath,
          matchType: 'path',
        });
      }

      if (normalizedPath.includes('controller')) {
        ruleSignals.push({
          skill: 'API Design Skill',
          confidence: 0.8,
          reason: `Detected 'controller' in modified file path: ${filePath}`,
          filePath,
          matchType: 'path',
        });
      }

      if (normalizedPath.includes('service')) {
        ruleSignals.push({
          skill: 'Backend Architecture Skill',
          confidence: 0.8,
          reason: `Detected 'service' in modified file path: ${filePath}`,
          filePath,
          matchType: 'path',
        });
      }

      if (normalizedPath.includes('prisma') || normalizedPath.includes('typeorm')) {
        ruleSignals.push({
          skill: 'Database Design Skill',
          confidence: 0.85,
          reason: `Detected database ORM pattern (prisma/typeorm) in modified file path: ${filePath}`,
          filePath,
          matchType: 'path',
        });
      }
    }

    // 2. Ekstraksi Sinyal dari Perubahan Konten Berkas (Git Diff Content Analysis)
    if (rawDiff) {
      const fileBlocks = this.splitDiffByFile(rawDiff);

      for (const block of fileBlocks) {
        const { filePath, additions, additionsCount, deletionsCount } = block;
        if (!additions.length) continue;

        const combinedAdditions = additions.join(' ');

        if (combinedAdditions.includes('jwt') || combinedAdditions.includes('jsonwebtoken')) {
          ruleSignals.push({
            skill: 'Security Skill',
            confidence: 0.8,
            reason: `Detected 'jwt' signatures inside code additions in: ${filePath}`,
            filePath,
            matchType: 'content',
            additionsCount,
            deletionsCount,
          });
        }

        if (combinedAdditions.includes('auth') || combinedAdditions.includes('login') || combinedAdditions.includes('register')) {
          ruleSignals.push({
            skill: 'Authentication Skill',
            confidence: 0.75,
            reason: `Detected credential or auth logical structures inside code additions in: ${filePath}`,
            filePath,
            matchType: 'content',
            additionsCount,
            deletionsCount,
          });
        }

        if (combinedAdditions.includes('controller') || combinedAdditions.includes('@get') || combinedAdditions.includes('@post')) {
          ruleSignals.push({
            skill: 'API Design Skill',
            confidence: 0.7,
            reason: `Detected Controller route or endpoint decorators inside code additions in: ${filePath}`,
            filePath,
            matchType: 'content',
            additionsCount,
            deletionsCount,
          });
        }

        if (combinedAdditions.includes('service') || combinedAdditions.includes('@injectable')) {
          ruleSignals.push({
            skill: 'Backend Architecture Skill',
            confidence: 0.7,
            reason: `Detected Injectable Service business logic structures inside code additions in: ${filePath}`,
            filePath,
            matchType: 'content',
            additionsCount,
            deletionsCount,
          });
        }

        if (combinedAdditions.includes('prisma') || combinedAdditions.includes('typeorm') || combinedAdditions.includes('schema.prisma')) {
          ruleSignals.push({
            skill: 'Database Design Skill',
            confidence: 0.8,
            reason: `Detected database ORM client signatures inside code additions in: ${filePath}`,
            filePath,
            matchType: 'content',
            additionsCount,
            deletionsCount,
          });
        }
      }
    }

    return ruleSignals;
  }

  /**
   * Memisahkan git diff biner/teks utuh menjadi blok-blok terpisah per berkas yang dimodifikasi.
   */
  private splitDiffByFile(rawDiff: string): Array<{
    filePath: string;
    additions: string[];
    additionsCount: number;
    deletionsCount: number;
  }> {
    const blocks: Array<{
      filePath: string;
      additions: string[];
      additionsCount: number;
      deletionsCount: number;
    }> = [];

    const fileDiffs = rawDiff.split('diff --git ');
    
    for (const fileDiff of fileDiffs) {
      if (!fileDiff.trim()) continue;

      const lines = fileDiff.split('\n');
      
      // Deteksi nama berkas dari header (contoh: a/src/main.ts b/src/main.ts)
      let filePath = 'unknown_file';
      const headerLine = lines[0];
      const match = headerLine.match(/b\/(.+)$/);
      if (match && match[1]) {
        filePath = match[1].trim();
      }

      const additions: string[] = [];
      let additionsCount = 0;
      let deletionsCount = 0;

      for (const line of lines.slice(1)) {
        if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('index ')) {
          continue;
        }

        if (line.startsWith('+')) {
          additions.push(line.substring(1).toLowerCase());
          additionsCount++;
        } else if (line.startsWith('-')) {
          deletionsCount++;
        }
      }

      blocks.push({
        filePath,
        additions,
        additionsCount,
        deletionsCount,
      });
    }

    return blocks;
  }
}
