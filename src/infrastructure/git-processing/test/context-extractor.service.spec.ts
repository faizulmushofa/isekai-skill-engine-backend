import { Test, TestingModule } from '@nestjs/testing';
import { ContextExtractorService } from '../services/context-extractor.service';
import { GitCoreService } from '../services/git-core.service';
import { ManifestExtractorFactory } from '../extractors/manifest-extractor.factory';
import * as fs from 'fs';

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(),
    promises: {
      readdir: jest.fn(),
      readFile: jest.fn(),
      stat: jest.fn(),
    },
  };
});

describe('ContextExtractorService', () => {
  let service: ContextExtractorService;
  let mockGitCore: Partial<GitCoreService>;
  let mockFactory: Partial<ManifestExtractorFactory>;

  beforeEach(async () => {
    (fs.existsSync as jest.Mock).mockReset();
    (fs.promises.readdir as jest.Mock).mockReset();
    (fs.promises.readFile as jest.Mock).mockReset();
    (fs.promises.stat as jest.Mock).mockReset();

    mockGitCore = {
      getRepoPath: jest.fn().mockReturnValue('/mock/repo/path'),
    };

    mockFactory = {
      getExtractor: jest.fn().mockImplementation((fileName: string) => {
        if (fileName === 'package.json') {
          return {
            supports: () => true,
            extract: () => ({
              manifest: { name: 'test-project' },
              dependencies: ['lodash', '@nestjs/core'],
            }),
          };
        }
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextExtractorService,
        { provide: GitCoreService, useValue: mockGitCore },
        { provide: ManifestExtractorFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<ContextExtractorService>(ContextExtractorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractContext', () => {
    it('should extract correct metadata and manifests using the strategy factory', async () => {
      // Mock files inside repo folder
      (fs.promises.readdir as jest.Mock).mockImplementation(async (dirPath) => {
        if (dirPath === '/mock/repo/path') {
          return ['README.md', 'package.json', 'src'];
        }
        if (dirPath === '/mock/repo/path/src') {
          return ['main.ts'];
        }
        return [];
      });

      // Mock fs.promises.stat
      (fs.promises.stat as jest.Mock).mockImplementation(async (filePath: string) => {
        const isDir = filePath.endsWith('src') || filePath === '/mock/repo/path';
        return {
          isDirectory: () => isDir,
        };
      });

      // Mock files contents
      (fs.promises.readFile as jest.Mock).mockImplementation(async (filePath: string) => {
        if (filePath.endsWith('README.md')) {
          return '# Isekai Project\nWelcome to the engine.';
        }
        if (filePath.endsWith('package.json')) {
          return '{}';
        }
        return '';
      });

      const context = await service.extractContext('test-repo');

      expect(context.readmeContent).toBe('# Isekai Project\nWelcome to the engine.');
      expect(context.manifests.packageJson).toBeDefined();
      expect(context.manifests.packageJson.name).toBe('test-project');
      expect(context.dependencies).toContain('lodash');
      expect(context.dependencies).toContain('@nestjs/core');
      expect(context.fileTree).toContain('src/main.ts');
      expect(context.entryPoints).toContain('src/main.ts');
    });
  });
});
