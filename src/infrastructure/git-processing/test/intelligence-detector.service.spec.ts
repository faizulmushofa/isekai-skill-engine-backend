import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceDetectorService } from '../services/intelligence-detector.service';
import { LanguageDetectorService } from '../services/language-detector.service';
import { RepoContext } from '../interfaces/git-processing.interfaces';

describe('IntelligenceDetectorService', () => {
  let service: IntelligenceDetectorService;
  let mockLanguageDetector: Partial<LanguageDetectorService>;

  beforeEach(async () => {
    mockLanguageDetector = {
      detectLanguages: jest.fn().mockReturnValue(['JS/TS']),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceDetectorService,
        { provide: LanguageDetectorService, useValue: mockLanguageDetector },
      ],
    }).compile();

    service = module.get<IntelligenceDetectorService>(IntelligenceDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectIntelligence', () => {
    it('should detect languages using LanguageDetectorService and detect architecture from fileTree', () => {
      const mockContext: RepoContext = {
        readmeContent: '# Hello',
        manifests: {},
        fileTree: ['src/modules/users/users.module.ts'],
        dependencies: [],
        entryPoints: [],
      };

      const profile = service.detectIntelligence(mockContext);

      expect(mockLanguageDetector.detectLanguages).toHaveBeenCalledWith(mockContext);
      expect(profile.language).toContain('JS/TS');
      expect(profile.architecture.type).toBe('Modular architecture');
    });
  });
});
