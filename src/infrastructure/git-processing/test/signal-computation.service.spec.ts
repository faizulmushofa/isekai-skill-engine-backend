import { SignalComputationService } from '../services/signal-computation.service';
import { RuleSignal } from '../interfaces/git-processing.interfaces';

describe('SignalComputationService', () => {
  let service: SignalComputationService;

  beforeEach(() => {
    service = new SignalComputationService();
  });

  it('should compute aggregated SkillSignals with mathematically correct formulas', () => {
    // Mock 2 rule signals for Auth Skill
    const mockRuleSignals: RuleSignal[] = [
      {
        skill: 'Authentication Skill',
        confidence: 0.85,
        reason: 'Path match',
        filePath: 'src/auth/auth.controller.ts',
        matchType: 'path',
        additionsCount: 10,
        deletionsCount: 2,
      },
      {
        skill: 'Authentication Skill',
        confidence: 0.75,
        reason: 'Content match',
        filePath: 'src/auth/auth.controller.ts',
        matchType: 'content',
        additionsCount: 10,
        deletionsCount: 2,
      },
    ];

    const totalFilesChanged = 4;
    const diffSummary = { additions: 40, deletions: 10 }; // Total changes = 50

    const skillSignals = service.computeSignals(mockRuleSignals, totalFilesChanged, diffSummary);

    expect(skillSignals.length).toBe(1);
    const authSignal = skillSignals[0];

    expect(authSignal.skill).toBe('Authentication Skill');
    
    // Probabilistic union: 1 - (1 - 0.85) * (1 - 0.75) = 1 - 0.15 * 0.25 = 1 - 0.0375 = 0.9625
    expect(authSignal.confidence).toBe(0.9625);
    
    // Strength = 2 signals
    expect(authSignal.strength).toBe(2);

    // Coverage = 1 matching file / 4 total files = 0.25
    expect(authSignal.coverage).toBe(0.25);

    // Intensity = (10 additions + 2 deletions in matching file) / (50 total changes) = 12 / 50 = 0.24
    expect(authSignal.intensity).toBe(0.24);

    expect(authSignal.reasons).toContain('Path match');
    expect(authSignal.reasons).toContain('Content match');
    expect(authSignal.reason).toContain('Coverage: 25.0%');
    expect(authSignal.reason).toContain('Intensity: 24.0%');
  });

  it('should return empty array if rule signals are empty', () => {
    const result = service.computeSignals([], 5, { additions: 10, deletions: 0 });
    expect(result).toEqual([]);
  });
});
