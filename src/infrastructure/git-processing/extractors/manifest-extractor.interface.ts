export abstract class ManifestExtractor {
  /**
   * Menentukan apakah ekstrakor ini mendukung berkas dengan nama tertentu.
   */
  abstract supports(fileName: string): boolean;

  /**
   * Mengekstrak data manifes terstruktur dan daftar dependensi dari isi teks berkas.
   */
  abstract extract(content: string): { manifest: any; dependencies: string[] };
}
