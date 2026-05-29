import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { PdfExtractor } from '../extractors/pdf.extractor';
import { TextNormalizer } from '../normalizers/text-normalizer';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));

describe('PdfExtractor', () => {
  let extractor: PdfExtractor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfExtractor, TextNormalizer],
    }).compile();

    extractor = module.get<PdfExtractor>(PdfExtractor);
    
    // Reset jest mocks
    jest.clearAllMocks();
  });

  it('should support application/pdf', () => {
    expect(extractor.supports('application/pdf')).toBe(true);
    expect(extractor.supports('text/plain')).toBe(false);
  });

  it('should successfully extract text from simple parenthesized Tj blocks', async () => {
    const mockPdfBinary = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Length 44 >>\nstream\nBT\n/F1 12 Tf\n72 712 Td\n(Hello NestJS Developer) Tj\nET\nendstream\nendobj\n%%EOF',
    );

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 1024 });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(mockPdfBinary);

    const result = await extractor.extract('/mock/path/file.pdf');

    expect(result.rawText).toContain('Hello NestJS Developer');
    expect(result.metadata.fileName).toBe('file.pdf');
    expect(result.metadata.fileSize).toBe(1024);
  });
});
