import { LanguageDetectorService } from '../services/language-detector.service';
import { RepoContext } from '../interfaces/git-processing.interfaces';

describe('LanguageDetectorService', () => {
  let service: LanguageDetectorService;

  beforeEach(() => {
    service = new LanguageDetectorService();
  });

  it('should detect JS/TS from package.json manifest', () => {
    const mockContext: RepoContext = {
      readmeContent: '',
      manifests: { packageJson: {} },
      fileTree: [],
      dependencies: [],
      entryPoints: [],
    };
    expect(service.detectLanguages(mockContext)).toContain('JS/TS');
  });

  it('should detect Rust and PHP from file tree extension fallback', () => {
    const mockContext: RepoContext = {
      readmeContent: '',
      manifests: {},
      fileTree: ['src/lib.rs', 'index.php', 'README.md'],
      dependencies: [],
      entryPoints: [],
    };

    const detected = service.detectLanguages(mockContext);
    expect(detected).toContain('Rust');
    expect(detected).toContain('PHP');
    expect(detected).not.toContain('JS/TS');
  });
});
