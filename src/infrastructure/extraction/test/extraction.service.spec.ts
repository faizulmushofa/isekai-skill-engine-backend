import { Test, TestingModule } from '@nestjs/testing';
import { ExtractionService } from '../extraction.service';
import { ExtractorFactory } from '../extractors/extractor.factory';
import { PdfExtractor } from '../extractors/pdf.extractor';
import { TxtExtractor } from '../extractors/txt.extractor';
import { TextNormalizer } from '../normalizers/text-normalizer';
import { ExtractionSourceType } from '../enums/extraction-source-type.enum';

describe('ExtractionService', () => {
  let service: ExtractionService;
  let mockPdfExtractor: jest.Mocked<PdfExtractor>;
  let mockTxtExtractor: jest.Mocked<TxtExtractor>;

  beforeEach(async () => {
    mockPdfExtractor = {
      supports: jest.fn().mockImplementation((mime) => mime === 'application/pdf'),
      extract: jest.fn().mockResolvedValue({
        rawText: 'PDF Content',
        normalizedText: 'pdf content',
        metadata: { fileName: 'test.pdf', mimeType: 'application/pdf', fileSize: 500, extractedAt: new Date() },
        sourceType: ExtractionSourceType.PDF,
      }),
    } as unknown as jest.Mocked<PdfExtractor>;

    mockTxtExtractor = {
      supports: jest.fn().mockImplementation((mime) => mime === 'text/plain'),
      extract: jest.fn().mockResolvedValue({
        rawText: 'TXT Content',
        normalizedText: 'txt content',
        metadata: { fileName: 'test.txt', mimeType: 'text/plain', fileSize: 100, extractedAt: new Date() },
        sourceType: ExtractionSourceType.TXT,
      }),
    } as unknown as jest.Mocked<TxtExtractor>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExtractionService,
        ExtractorFactory,
        { provide: PdfExtractor, useValue: mockPdfExtractor },
        { provide: TxtExtractor, useValue: mockTxtExtractor },
      ],
    }).compile();

    service = module.get<ExtractionService>(ExtractionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Content Ingestion & Factory routing', () => {
    it('should route to PdfExtractor when given application/pdf mime type', async () => {
      const result = await service.extractContent('/path/doc.pdf', 'application/pdf');

      expect(mockPdfExtractor.extract).toHaveBeenCalledWith('/path/doc.pdf');
      expect(result.sourceType).toBe(ExtractionSourceType.PDF);
      expect(result.normalizedText).toBe('pdf content');
    });

    it('should route to TxtExtractor when given text/plain mime type', async () => {
      const result = await service.extractContent('/path/note.txt', 'text/plain');

      expect(mockTxtExtractor.extract).toHaveBeenCalledWith('/path/note.txt');
      expect(result.sourceType).toBe(ExtractionSourceType.TXT);
      expect(result.normalizedText).toBe('txt content');
    });

    it('should throw BadRequestException if MIME type is unsupported', async () => {
      await expect(
        service.extractContent('/path/image.png', 'image/png'),
      ).rejects.toThrow(/tidak didukung/);
    });

    it('should throw BadRequestException for empty parameters', async () => {
      await expect(service.extractContent('', 'text/plain')).rejects.toThrow(
        /Path berkas fisik wajib diisi/,
      );
      await expect(service.extractContent('/path/file.txt', '')).rejects.toThrow(
        /Tipe media \(MIME type\) berkas wajib diisi/,
      );
    });
  });
});
