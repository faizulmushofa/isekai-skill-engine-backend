import { Test, TestingModule } from '@nestjs/testing';
import { GitCoreService } from '../services/git-core.service';
import { exec } from 'child_process';
import * as fs from 'fs';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('fs', () => {
  const original = jest.requireActual('fs');
  return {
    ...original,
    existsSync: jest.fn(),
    mkdirSync: jest.fn(),
    rmSync: jest.fn(),
  };
});

describe('GitCoreService', () => {
  let service: GitCoreService;
  let mockExec: jest.Mock;

  beforeEach(async () => {
    mockExec = exec as unknown as jest.Mock;
    mockExec.mockReset();
    (fs.existsSync as jest.Mock).mockReset();
    (fs.mkdirSync as jest.Mock).mockReset();
    (fs.rmSync as jest.Mock).mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [GitCoreService],
    }).compile();

    service = module.get<GitCoreService>(GitCoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('clone', () => {
    it('should invoke git clone and remove existing folder if present', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockExec.mockImplementation((cmd, cb) => cb(null, { stdout: 'Cloned successfully' }));

      const repoUrl = 'https://github.com/user/repo.git';
      const repoId = 'test-repo-id';
      const pathResult = await service.clone(repoUrl, repoId);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.rmSync).toHaveBeenCalledWith(expect.any(String), { recursive: true, force: true });
      expect(mockExec).toHaveBeenCalledWith(
        `git clone --depth 1 "${repoUrl}" "${pathResult}"`,
        expect.any(Function),
      );
    });

    it('should throw InternalServerErrorException on clone failure', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      mockExec.mockImplementation((cmd, cb) => cb(new Error('Network error')));

      await expect(service.clone('invalid-url', 'error-repo')).rejects.toThrow();
    });
  });

  describe('fetch', () => {
    it('should invoke git fetch inside work dir', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      mockExec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '' }));

      await service.fetch('test-repo');

      expect(mockExec).toHaveBeenCalledWith(
        'git fetch origin',
        { cwd: expect.any(String) },
        expect.any(Function),
      );
    });
  });

  describe('getLatestCommitHash', () => {
    it('should return trimmed stdout of git rev-parse HEAD', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '  abcdef123456 \n' }));

      const hash = await service.getLatestCommitHash('test-repo');
      expect(hash).toBe('abcdef123456');
    });
  });

  describe('getFilesChanged', () => {
    it('should return array of file paths', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: 'src/main.ts\npackage.json\n' }));

      const files = await service.getFilesChanged('test-repo', 'hash1', 'hash2');
      expect(files).toEqual(['src/main.ts', 'package.json']);
    });
  });

  describe('getDiffSummary', () => {
    it('should parse additions and deletions from git diff --numstat', async () => {
      mockExec.mockImplementation((cmd, opts, cb) =>
        cb(null, { stdout: '12\t5\tsrc/main.ts\n10\t0\tREADME.md\n-\t-\tlogo.png\n' }),
      );

      const summary = await service.getDiffSummary('test-repo', 'hash1', 'hash2');
      expect(summary).toEqual({ additions: 22, deletions: 5 });
    });
  });

  describe('getRawDiff', () => {
    it('should return stdout of git diff', async () => {
      mockExec.mockImplementation((cmd, opts, cb) => cb(null, { stdout: '+ console.log("hello");' }));

      const diff = await service.getRawDiff('test-repo', 'hash1', 'hash2');
      expect(diff).toContain('+ console.log("hello");');
    });
  });
});
