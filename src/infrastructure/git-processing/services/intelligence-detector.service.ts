import { Injectable } from '@nestjs/common';
import { LanguageDetectorService } from './language-detector.service';
import { RepoContext, RepoIntelligenceProfile } from '../interfaces/git-processing.interfaces';

@Injectable()
export class IntelligenceDetectorService {
  constructor(private readonly languageDetector: LanguageDetectorService) {}

  /**
   * Melakukan deteksi heuristik murni terhadap repositori untuk menghasilkan RepoIntelligenceProfile.
   */
  detectIntelligence(context: RepoContext): RepoIntelligenceProfile {
    const language = this.languageDetector.detectLanguages(context);
    const framework = this.detectFrameworks(context);
    const database = this.detectDatabases(context);
    const architecture = this.detectArchitecture(context.fileTree);

    return {
      language,
      framework,
      database,
      architecture,
    };
  }

  /**
   * Mendeteksi kerangka kerja (framework) dari dependensi repositori.
   */
  private detectFrameworks(context: RepoContext): string[] {
    const frameworks: string[] = [];
    const deps = context.dependencies || [];
    const manifests = context.manifests || {};

    // Deteksi NestJS
    const hasNest = deps.some((d) => d.includes('nestjs')) || 
      (manifests.packageJson?.dependencies && Object.keys(manifests.packageJson.dependencies).some((k) => k.includes('nestjs')));
    if (hasNest) {
      frameworks.push('NestJS');
    }

    // Deteksi Express
    const hasExpress = deps.some((d) => d === 'express') || 
      (manifests.packageJson?.dependencies && Object.keys(manifests.packageJson.dependencies).some((k) => k === 'express'));
    if (hasExpress) {
      frameworks.push('Express');
    }

    // Deteksi Spring Boot
    const hasSpring = deps.some((d) => d.includes('spring')) || 
      (manifests.pomXml && (manifests.pomXml.includes('spring-boot') || manifests.pomXml.includes('springframework')));
    if (hasSpring) {
      frameworks.push('Spring Boot');
    }

    return frameworks;
  }

  /**
   * Mendeteksi sistem/pustaka database (ORM/ODM) dari dependensi repositori.
   */
  private detectDatabases(context: RepoContext): string[] {
    const databases: string[] = [];
    const deps = context.dependencies || [];
    const manifests = context.manifests || {};

    // Deteksi Prisma
    const hasPrisma = deps.some((d) => d.includes('prisma')) || 
      (manifests.packageJson?.dependencies && Object.keys(manifests.packageJson.dependencies).some((k) => k.includes('prisma')));
    if (hasPrisma) {
      databases.push('Prisma');
    }

    // Deteksi TypeORM
    const hasTypeorm = deps.some((d) => d === 'typeorm') || 
      (manifests.packageJson?.dependencies && Object.keys(manifests.packageJson.dependencies).some((k) => k === 'typeorm'));
    if (hasTypeorm) {
      databases.push('TypeORM');
    }

    // Deteksi MongoDB / Mongoose
    const hasMongoose = deps.some((d) => d === 'mongoose' || d === 'mongodb') || 
      (manifests.packageJson?.dependencies && Object.keys(manifests.packageJson.dependencies).some((k) => k === 'mongoose' || k === 'mongodb'));
    if (hasMongoose) {
      databases.push('MongoDB');
    }

    return databases;
  }

  /**
   * Mendeteksi gaya/tipe arsitektur kode berdasarkan struktur direktori berkas.
   */
  private detectArchitecture(fileTree: string[]): { type: string; confidence: number; reason: string } {
    if (!fileTree || fileTree.length === 0) {
      return {
        type: 'Standard Layered',
        confidence: 0.5,
        reason: 'Default fallback architecture classification based on general file layout.',
      };
    }

    // Normalisasi jalur file menggunakan slash miring depan (/)
    const normalizedPaths = fileTree.map((f) => f.replace(/\\/g, '/').toLowerCase());
    
    // Cek segmen folder dalam file paths
    const folderSegments = new Set<string>();
    for (const pathStr of normalizedPaths) {
      const parts = pathStr.split('/');
      parts.slice(0, -1).forEach((part) => folderSegments.add(part));
    }

    const hasModules = folderSegments.has('modules');
    const hasControllers = folderSegments.has('controllers');
    const hasDomain = folderSegments.has('domain');
    const hasApplication = folderSegments.has('application');

    if (hasDomain && hasApplication) {
      return {
        type: 'Clean Architecture',
        confidence: 0.9,
        reason: 'Detected both /domain and /application folders in directory tree.',
      };
    }

    if (hasModules) {
      return {
        type: 'Modular architecture',
        confidence: 0.85,
        reason: 'Detected /modules folder in directory tree.',
      };
    }

    if (hasControllers) {
      return {
        type: 'MVC',
        confidence: 0.8,
        reason: 'Detected /controllers folder in directory tree.',
      };
    }

    return {
      type: 'Standard Layered',
      confidence: 0.5,
      reason: 'Default fallback architecture classification based on general file layout.',
    };
  }
}
