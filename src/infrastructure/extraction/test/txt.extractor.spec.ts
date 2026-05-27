import { Test, TestingModule } from '@nestjs/testing';
import * as fs from 'fs';
import { TxtExtractor } from '../extractors/txt.extractor';
import { TextNormalizer } from '../normalizers/text-normalizer';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  promises: {
    readFile: jest.fn(),
  },
}));

describe('TxtExtractor', () => {
  let extractor: TxtExtractor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TxtExtractor, TextNormalizer],
    }).compile();

    extractor = module.get<TxtExtractor>(TxtExtractor);
    jest.clearAllMocks();
  });

  it('should support text/plain and text/markdown', () => {
    expect(extractor.supports('text/plain')).toBe(true);
    expect(extractor.supports('text/markdown')).toBe(true);
    expect(extractor.supports('application/pdf')).toBe(false);
  });

  it('should read plain text file and apply normalizations', async () => {
    const rawContent = '   Line 1 with spaces   \n\n\n   Line 2\n';
    
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 100 });
    (fs.promises.readFile as jest.Mock).mockResolvedValue(Buffer.from(rawContent));

    const result = await extractor.extract('/mock/path/file.txt');

    expect(result.rawText).toBe(rawContent);
    // Collapses consecutive blank lines and trims spaces
    expect(result.normalizedText).toBe('Line 1 with spaces\n\nLine 2');
    expect(result.metadata.fileName).toBe('file.txt');
    expect(result.metadata.fileSize).toBe(100);
  });
});
