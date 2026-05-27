import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { GitCoreService } from './services/git-core.service';
import { ContextExtractorService } from './services/context-extractor.service';
import { IntelligenceDetectorService } from './services/intelligence-detector.service';
import { RuleEngineService } from './services/rule-engine.service';
import { SignalComputationService } from './services/signal-computation.service';
import { AIInputPayload, RepoIndex, InitContext, CommitContext } from './interfaces/git-processing.interfaces';

@Injectable()
export class GitProcessingService {
  private readonly logger = new Logger(GitProcessingService.name);

  constructor(
    private readonly gitCore: GitCoreService,
    private readonly contextExtractor: ContextExtractorService,
    private readonly intelligenceDetector: IntelligenceDetectorService,
    private readonly ruleEngine: RuleEngineService,
    private readonly signalComputation: SignalComputationService,
  ) {}

  /**
   * STATE 1: INIT STATE.
   * Melakukan kloning dangkal repositori, mengekstrak struktur awal,
   * mendeteksi teknologi heuristik, menyimpan status index repositori,
   * dan mengembalikan AIInputPayload yang berisi InitContext.
   */
  async initializeRepository(repoId: string, repoUrl: string): Promise<AIInputPayload> {
    if (!repoId || !repoId.trim()) {
      throw new BadRequestException('ID repositori wajib diisi.');
    }
    if (!repoUrl || !repoUrl.trim()) {
      throw new BadRequestException('URL repositori wajib diisi.');
    }

    try {
      this.logger.log(`Initializing repository for ID: ${repoId}, URL: ${repoUrl}`);

      // 1. Klon repositori menggunakan Git Core (shallow clone)
      const repoPath = await this.gitCore.clone(repoUrl, repoId);

      // 2. Dapatkan hash komit terbaru
      const lastCommitHash = await this.gitCore.getLatestCommitHash(repoId);

      // 3. Jalankan Repository Context Extractor
      const repoContext = await this.contextExtractor.extractContext(repoId);

      // 4. Jalankan Repository Intelligence Detector
      const repoIntelligence = this.intelligenceDetector.detectIntelligence(repoContext);

      // 5. Simpan status repositori (repo-index.json)
      const indexFilePath = path.join(repoPath, '..', `repo-index-${repoId}.json`);
      const repoIndex: RepoIndex = {
        repoId,
        repoUrl,
        lastCommitHash,
        status: 'READY',
        updatedAt: new Date().toISOString(),
      };
      
      await fs.promises.writeFile(indexFilePath, JSON.stringify(repoIndex, null, 2), 'utf-8');
      this.logger.log(`Saved repository index state at: ${indexFilePath}`);

      // 6. Bentuk dan kembalikan InitContext sebagai AIInputPayload
      const initContext: InitContext = {
        repoId,
        repoUrl,
        repoContext,
        repoIntelligence,
        fileStructure: repoContext.fileTree,
        dependencies: repoContext.dependencies,
        projectSummary: repoContext.readmeContent,
      };

      return {
        initContext,
        repoId,
        repoIntelligence,
        signalData: {
          fileStructure: repoContext.fileTree,
          dependencies: repoContext.dependencies,
          ruleSignals: [], // Kosong pada inisialisasi awal
        },
        metadata: {
          lastCommitHash,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to initialize repository ${repoId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * STATE 2: TRACKING STATE.
   * Menerima event webhook commit, memuat status index berkas repo-index.json,
   * melakukan fetching, menghitung incremental diff, menganalisis perbedaan baris kode deterministik,
   * memperbarui komit hash pada index berkas, dan mengembalikan AIInputPayload yang berisi CommitContext.
   */
  async processWebhookCommit(repoId: string, newCommitHash?: string): Promise<AIInputPayload> {
    if (!repoId || !repoId.trim()) {
      throw new BadRequestException('ID repositori wajib diisi.');
    }

    const baseRepoPath = this.gitCore.getRepoPath(repoId);
    const indexFilePath = path.join(baseRepoPath, '..', `repo-index-${repoId}.json`);

    // 1. Muat status repositori
    if (!fs.existsSync(indexFilePath)) {
      throw new NotFoundException(`Repositori dengan ID '${repoId}' belum diinisialisasi. Jalankan initializeRepository terlebih dahulu.`);
    }

    try {
      const indexContent = await fs.promises.readFile(indexFilePath, 'utf-8');
      const repoIndex: RepoIndex = JSON.parse(indexContent);
      const lastCommitHash = repoIndex.lastCommitHash;

      this.logger.log(`Tracking commit updates for repo: ${repoId}, last hash: ${lastCommitHash}`);

      // 2. Lakukan Git Fetch (Bukan kloning ulang)
      await this.gitCore.fetch(repoId);

      // 3. Tentukan hash komit target baru
      const resolvedNewHash = newCommitHash && newCommitHash.trim()
        ? newCommitHash.trim()
        : await this.gitCore.getLatestCommitHash(repoId);

      // 4. Hitung perbedaan inkremental (files changed, additions, deletions, raw diff text)
      const filesChanged = await this.gitCore.getFilesChanged(repoId, lastCommitHash, resolvedNewHash);
      const diffSummary = await this.gitCore.getDiffSummary(repoId, lastCommitHash, resolvedNewHash);
      const rawDiff = await this.gitCore.getRawDiff(repoId, lastCommitHash, resolvedNewHash);

      // 5. Jalankan RuleEngine (Deterministic Detection Layer)
      const rawRuleSignals = this.ruleEngine.extractSignals(filesChanged, rawDiff);

      // 6. Jalankan SignalComputationService (Signal Intelligence Layer)
      const skillSignals = this.signalComputation.computeSignals(
        rawRuleSignals,
        filesChanged.length,
        diffSummary,
      );

      // 7. Ekstrak ulang konteks repositori terbaru untuk mendapatkan profil inteligensi terbaru
      const repoContext = await this.contextExtractor.extractContext(repoId);
      const repoIntelligence = this.intelligenceDetector.detectIntelligence(repoContext);

      // 8. Perbarui status index berkas
      repoIndex.lastCommitHash = resolvedNewHash;
      repoIndex.updatedAt = new Date().toISOString();
      await fs.promises.writeFile(indexFilePath, JSON.stringify(repoIndex, null, 2), 'utf-8');

      // 9. Bentuk dan kembalikan CommitContext sebagai AIInputPayload
      const commitContext: CommitContext = {
        commitHash: resolvedNewHash,
        repoId,
        filesChanged,
        diffSummary,
        rawDiff,
        ruleSignals: skillSignals,
      };

      return {
        commitContext,
        repoId,
        repoIntelligence,
        signalData: {
          fileStructure: repoContext.fileTree,
          dependencies: repoContext.dependencies,
          ruleSignals: skillSignals,
          diffSummary,
        },
        metadata: {
          lastCommitHash: resolvedNewHash,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Failed to process webhook commit for repo ${repoId}: ${error.message}`);
      throw error;
    }
  }
}
