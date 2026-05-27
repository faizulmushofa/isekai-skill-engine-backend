import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { GitCoreService } from './git-core.service';
import { ManifestExtractorFactory } from '../extractors/manifest-extractor.factory';
import { RepoContext } from '../interfaces/git-processing.interfaces';

@Injectable()
export class ContextExtractorService {
  private readonly logger = new Logger(ContextExtractorService.name);

  constructor(
    private readonly gitCore: GitCoreService,
    private readonly manifestExtractorFactory: ManifestExtractorFactory,
  ) {}

  /**
   * Mengekstrak seluruh konteks dasar dari repositori fisik menggunakan Strategy & Factory Pattern.
   */
  async extractContext(repoId: string): Promise<RepoContext> {
    const repoPath = this.gitCore.getRepoPath(repoId);
    
    const readmeContent = await this.readReadme(repoPath);
    const { manifests, dependencies } = await this.parseRepoManifests(repoPath);
    const fileTree = await this.buildFileTree(repoPath, repoPath);
    const entryPoints = await this.detectEntryPoints(fileTree);

    return {
      readmeContent,
      manifests,
      fileTree,
      dependencies,
      entryPoints,
    };
  }

  /**
   * Mencari README.md dan membaca isinya.
   */
  private async readReadme(repoPath: string): Promise<string> {
    try {
      const files = await fs.promises.readdir(repoPath);
      const readmeFile = files.find((f) => f.toLowerCase() === 'readme.md');
      if (readmeFile) {
        const fullPath = path.join(repoPath, readmeFile);
        return await fs.promises.readFile(fullPath, 'utf-8');
      }
    } catch (error) {
      this.logger.warn(`Failed to read README.md: ${error}`);
    }
    return '';
  }

  /**
   * Membaca dan menafsirkan berkas manifes repositori secara dinamis memanfaatkan pabrikasi strategi.
   */
  private async parseRepoManifests(repoPath: string): Promise<{
    manifests: Record<string, any>;
    dependencies: string[];
  }> {
    const manifests: Record<string, any> = {};
    const dependenciesSet = new Set<string>();

    try {
      const files = await fs.promises.readdir(repoPath);
      
      for (const file of files) {
        const extractor = this.manifestExtractorFactory.getExtractor(file);
        if (extractor) {
          const filePath = path.join(repoPath, file);
          try {
            const content = await fs.promises.readFile(filePath, 'utf-8');
            const { manifest, dependencies } = extractor.extract(content);
            
            // Simpan ke peta manifest berdasarkan nama berkas dalam camelCase (contoh: package.json -> packageJson)
            const camelCaseName = file.replace(/\.([a-z])/g, (_, g) => g.toUpperCase()).replace(/\.[a-z]+$/, '');
            manifests[camelCaseName] = manifest;

            // Kumpulkan semua dependensi
            dependencies.forEach((d) => dependenciesSet.add(d));
          } catch (e) {
            this.logger.warn(`Failed to read/parse manifest file '${file}': ${e}`);
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Failed to readdir to scan manifest files: ${error}`);
    }

    return {
      manifests,
      dependencies: Array.from(dependenciesSet),
    };
  }

  /**
   * Membangun daftar rekursif pohon berkas di repositori (mengabaikan folder besar).
   */
  private async buildFileTree(dir: string, baseDir: string): Promise<string[]> {
    let results: string[] = [];
    const list = await fs.promises.readdir(dir);

    const ignoredFolders = new Set([
      '.git',
      'node_modules',
      'dist',
      'build',
      'target',
      '.gradle',
      'vendor',
      '.next',
      '.nuxt',
      'coverage',
      'tmp',
    ]);

    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = await fs.promises.stat(filePath);

      if (stat && stat.isDirectory()) {
        if (!ignoredFolders.has(file)) {
          const subTree = await this.buildFileTree(filePath, baseDir);
          results = results.concat(subTree);
        }
      } else {
        const relativePath = path.relative(baseDir, filePath);
        results.push(relativePath);
      }
    }

    return results;
  }

  /**
   * Mendeteksi berkas-berkas entry points umum dari file tree.
   */
  private async detectEntryPoints(fileTree: string[]): Promise<string[]> {
    const commonEntries = new Set([
      'src/main.ts',
      'src/index.ts',
      'src/app.ts',
      'src/main.js',
      'src/index.js',
      'main.go',
      'index.js',
      'app.js',
      'server.js',
      'manage.py',
      'app.py',
      'main.py',
      'src/main.go',
    ]);

    return fileTree.filter((file) => commonEntries.has(file) || commonEntries.has(file.replace(/\\/g, '/')));
  }
}
