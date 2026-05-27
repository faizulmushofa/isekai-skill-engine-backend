import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { exec } from 'child_process';
import * as util from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execPromise = util.promisify(exec);

@Injectable()
export class GitCoreService {
  private readonly logger = new Logger(GitCoreService.name);
  private readonly baseReposDir = path.join(process.cwd(), 'data', 'git-repos');

  constructor() {
    // Pastikan direktori penyimpanan dasar sudah dibuat
    if (!fs.existsSync(this.baseReposDir)) {
      fs.mkdirSync(this.baseReposDir, { recursive: true });
    }
  }

  /**
   * Mengembalikan jalur folder repositori berdasarkan repoId.
   */
  getRepoPath(repoId: string): string {
    return path.join(this.baseReposDir, repoId);
  }

  /**
   * Mengklon repositori secara dangkal (shallow clone dengan depth 1).
   */
  async clone(repoUrl: string, repoId: string): Promise<string> {
    const targetPath = this.getRepoPath(repoId);
    
    // Hapus direktori jika sudah ada sebelumnya untuk menghindari konflik
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }

    try {
      this.logger.log(`Cloning repository ${repoUrl} to ${targetPath} (shallow, depth=1)`);
      await execPromise(`git clone --depth 1 "${repoUrl}" "${targetPath}"`);
      return targetPath;
    } catch (error: any) {
      this.logger.error(`Failed to clone repository ${repoUrl}: ${error.message}`);
      throw new InternalServerErrorException(`Gagal mengklon repositori: ${error.message}`);
    }
  }

  /**
   * Melakukan fetch terhadap repositori untuk sinkronisasi pembaruan.
   */
  async fetch(repoId: string): Promise<void> {
    const repoPath = this.getRepoPath(repoId);
    if (!fs.existsSync(repoPath)) {
      throw new InternalServerErrorException(`Folder repositori ${repoId} tidak ditemukan.`);
    }

    try {
      this.logger.log(`Fetching updates for repository in ${repoPath}`);
      // Jalankan git fetch di dalam direktori kerja repositori tersebut
      await execPromise('git fetch origin', { cwd: repoPath });
    } catch (error: any) {
      this.logger.error(`Failed to fetch repository updates for ${repoId}: ${error.message}`);
      throw new InternalServerErrorException(`Gagal mengambil data pembaruan Git: ${error.message}`);
    }
  }

  /**
   * Mengambil hash komit terbaru (HEAD) saat ini.
   */
  async getLatestCommitHash(repoId: string): Promise<string> {
    const repoPath = this.getRepoPath(repoId);
    try {
      const { stdout } = await execPromise('git rev-parse HEAD', { cwd: repoPath });
      return stdout.trim();
    } catch (error: any) {
      this.logger.error(`Failed to parse HEAD hash for ${repoId}: ${error.message}`);
      throw new InternalServerErrorException(`Gagal mengambil hash komit terbaru: ${error.message}`);
    }
  }

  /**
   * Mendapatkan daftar nama berkas yang berubah antara dua commit hash.
   */
  async getFilesChanged(repoId: string, lastHash: string, newHash: string): Promise<string[]> {
    const repoPath = this.getRepoPath(repoId);
    try {
      const { stdout } = await execPromise(`git diff --name-only "${lastHash}" "${newHash}"`, { cwd: repoPath });
      return stdout
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f.length > 0);
    } catch (error: any) {
      this.logger.error(`Failed to get files changed for ${repoId}: ${error.message}`);
      // Jika commit lama tidak ditemukan (karena shallow clone), lakukan perbandingan dengan HEAD saja
      try {
        const { stdout } = await execPromise(`git diff --name-only HEAD~1 HEAD`, { cwd: repoPath });
        return stdout
          .split('\n')
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
      } catch (fallbackError: any) {
        return [];
      }
    }
  }

  /**
   * Mengambil ringkasan penambahan (additions) dan pengurangan (deletions) baris kode.
   */
  async getDiffSummary(repoId: string, lastHash: string, newHash: string): Promise<{ additions: number; deletions: number }> {
    const repoPath = this.getRepoPath(repoId);
    let additions = 0;
    let deletions = 0;

    try {
      const { stdout } = await execPromise(`git diff --numstat "${lastHash}" "${newHash}"`, { cwd: repoPath });
      const lines = stdout.split('\n');
      
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          const add = parseInt(parts[0], 10);
          const del = parseInt(parts[1], 10);
          if (!isNaN(add)) additions += add;
          if (!isNaN(del)) deletions += del;
        }
      }
    } catch (error: any) {
      this.logger.warn(`Failed to parse diff numstat for ${repoId}: ${error.message}`);
      // Fallback ke diff log default
      try {
        const { stdout } = await execPromise('git diff --shortstat', { cwd: repoPath });
        const match = stdout.match(/(\d+)\s+insertion[s]?\(\+\),\s+(\d+)\s+deletion[s]?\(-\)/);
        if (match) {
          additions = parseInt(match[1], 10);
          deletions = parseInt(match[2], 10);
        }
      } catch (fallbackError) {
        // Abaikan dan gunakan 0
      }
    }

    return { additions, deletions };
  }

  /**
   * Mengambil teks perbedaan kode mentah (Raw Git Diff).
   */
  async getRawDiff(repoId: string, lastHash: string, newHash: string): Promise<string> {
    const repoPath = this.getRepoPath(repoId);
    try {
      const { stdout } = await execPromise(`git diff "${lastHash}" "${newHash}"`, { cwd: repoPath });
      return stdout;
    } catch (error: any) {
      this.logger.error(`Failed to get raw diff for ${repoId}: ${error.message}`);
      // Fallback ke diff komit terakhir
      try {
        const { stdout } = await execPromise('git diff HEAD~1 HEAD', { cwd: repoPath });
        return stdout;
      } catch (fallbackError) {
        return '';
      }
    }
  }
}
