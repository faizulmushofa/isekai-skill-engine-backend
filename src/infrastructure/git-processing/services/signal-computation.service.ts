import { Injectable } from '@nestjs/common';
import { RuleSignal, SkillSignal } from '../interfaces/git-processing.interfaces';

@Injectable()
export class SignalComputationService {
  /**
   * Mengonversi daftar flat RuleSignal[] menjadi SkillSignal[] teragregasi kognitif deterministik.
   */
  computeSignals(
    ruleSignals: RuleSignal[],
    totalFilesChangedCount: number,
    diffSummary: { additions: number; deletions: number },
  ): SkillSignal[] {
    if (!ruleSignals || ruleSignals.length === 0) {
      return [];
    }

    const totalChanges = diffSummary.additions + diffSummary.deletions;
    
    // 1. Kelompokkan RuleSignal berdasarkan nama keahlian (skill)
    const groupedSignals = new Map<string, RuleSignal[]>();
    for (const signal of ruleSignals) {
      const list = groupedSignals.get(signal.skill) || [];
      list.push(signal);
      groupedSignals.set(signal.skill, list);
    }

    const skillSignals: SkillSignal[] = [];

    // 2. Lakukan perhitungan deterministik murni untuk masing-masing keahlian
    for (const [skill, signals] of groupedSignals.entries()) {
      // A. Hitung Aggregated Confidence menggunakan Independen Probabilistik Union: 1 - (1-c1)*(1-c2)*...
      let inverseProduct = 1;
      for (const sig of signals) {
        inverseProduct *= (1 - sig.confidence);
      }
      const confidence = parseFloat((1 - inverseProduct).toFixed(4));

      // B. Hitung Strength (Kekuatan): Jumlah kemunculan kecocokan sinyal aturan
      const strength = signals.length;

      // C. Hitung Coverage (Cakupan): Rasio berkas terkait keahlian terhadap total berkas berubah
      const matchingFiles = new Set<string>();
      for (const sig of signals) {
        if (sig.filePath) {
          matchingFiles.add(sig.filePath);
        }
      }
      const coverage = totalFilesChangedCount > 0 
        ? parseFloat((matchingFiles.size / totalFilesChangedCount).toFixed(4)) 
        : 0;

      // D. Hitung Intensity (Intensitas): Rasio baris modifikasi berkas terkait keahlian terhadap total baris commit
      let matchingFilesChanges = 0;
      const processedFilesForChanges = new Set<string>();

      for (const sig of signals) {
        // Hanya jumlahkan perubahan unik dari setiap berkas sekali saja untuk menghindari penghitungan ganda
        const fileKey = `${sig.filePath}`;
        if (!processedFilesForChanges.has(fileKey)) {
          processedFilesForChanges.add(fileKey);
          const add = sig.additionsCount || 0;
          const del = sig.deletionsCount || 0;
          matchingFilesChanges += (add + del);
        }
      }

      // Jika intensitas dihitung 0 dari ruleSignals (karena matchType 'path' tidak merekam additionsCount),
      // berikan bobot dasar proporsional terhadap kontribusi berkas berubah jika totalChanges > 0
      if (matchingFilesChanges === 0 && totalChanges > 0) {
        matchingFilesChanges = matchingFiles.size; // 1 baris kontribusi per berkas
      }

      const intensity = totalChanges > 0
        ? parseFloat((matchingFilesChanges / totalChanges).toFixed(4))
        : 0;

      // E. Kumpulkan alasan-alasan unik dan susun deskripsi alasan teragregasi
      const reasonsSet = new Set<string>();
      for (const sig of signals) {
        reasonsSet.add(sig.reason);
      }
      const reasons = Array.from(reasonsSet);
      const reason = `Skill '${skill}' detected with strength ${strength}. Coverage: ${(coverage * 100).toFixed(1)}%. Intensity: ${(intensity * 100).toFixed(1)}%. Matched signals: ${reasons.join('; ')}`;

      skillSignals.push({
        skill,
        confidence,
        reason,
        strength,
        coverage,
        intensity,
        reasons,
      });
    }

    return skillSignals;
  }
}
