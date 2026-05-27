import { Test, TestingModule } from '@nestjs/testing';
import { SourceType } from '@prisma/client';
import { SkillMathEngine } from '../math/skill-math.engine';
import { SkillEngineCalibration } from '../calibration/skill-engine-calibration';
import { WeightStrategyFactory } from '../strategies/weight-strategy.factory';
import { JournalWeightStrategy } from '../strategies/journal-weight.strategy';
import { ProjectWeightStrategy } from '../strategies/project-weight.strategy';
import { QuizWeightStrategy } from '../strategies/quiz-weight.strategy';
import { SkillProgressionService } from './skill-progression.service';

describe('Skill Engine - Production-Grade Architecture Tests', () => {
  describe('1. Shared Calculation Layer (SkillMathEngine)', () => {
    it('should clamp values within the specified bounds', () => {
      expect(SkillMathEngine.clamp(120, 0, 100)).toBe(100);
      expect(SkillMathEngine.clamp(-15, 0, 100)).toBe(0);
      expect(SkillMathEngine.clamp(45.5, 0, 100)).toBe(45.5);
    });

    it('should scale scores using weights correctly', () => {
      // 80 raw score scaled by 0.5 weight = 40
      expect(SkillMathEngine.scaleScore(80, 0.5)).toBe(40);
      // Handles boundaries gracefully
      expect(SkillMathEngine.scaleScore(150, 1.2)).toBe(100); 
    });

    it('should apply the Bayesian progression formula accurately', () => {
      // newSkill = oldSkill + alpha * (evidence - oldSkill)
      // old = 50, evidence = 80, alpha = 0.2
      // new = 50 + 0.2 * (80 - 50) = 50 + 0.2 * 30 = 56
      const result = SkillMathEngine.bayesianUpdate(50, 80, 0.2);
      expect(result).toBeCloseTo(56);
    });

    it('should compute the contribution difference correctly', () => {
      expect(SkillMathEngine.computeContribution(50, 56.4)).toBeCloseTo(6.4);
    });

    it('should mitigate precision loss accumulatively', () => {
      let progress = 10.0;
      const alpha = 0.1;
      const weightedScore = 30.0; // static evidence
      
      // Perform 5 successive small updates
      for (let i = 0; i < 5; i++) {
        progress = SkillMathEngine.bayesianUpdate(progress, weightedScore, alpha);
      }
      
      // If rounded to Int at each step, values would drift or truncate.
      // With Float, progress resolves precisely:
      // Step 1: 10 + 0.1 * 20 = 12.0
      // Step 2: 12 + 0.1 * 18 = 13.8
      // Step 3: 13.8 + 0.1 * 16.2 = 15.42
      // Step 4: 15.42 + 0.1 * 14.58 = 16.878
      // Step 5: 16.878 + 0.1 * 13.122 = 18.1902
      expect(progress).toBeCloseTo(18.1902, 4);
    });
  });

  describe('2. Global Calibration Layer', () => {
    let calibration: SkillEngineCalibration;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [SkillEngineCalibration],
      }).compile();

      calibration = module.get<SkillEngineCalibration>(SkillEngineCalibration);
    });

    it('should maintain the correct formula version', () => {
      expect(calibration.FORMULA_VERSION).toBe('v1.0');
    });

    it('should return configured learning rates and weights', () => {
      const journalConfig = calibration.getParams(SourceType.JOURNAL);
      expect(journalConfig.alpha).toBe(0.1);
      expect(journalConfig.weight).toBe(0.3);

      const projectConfig = calibration.getParams(SourceType.PROJECT);
      expect(projectConfig.alpha).toBe(0.2);
      expect(projectConfig.weight).toBe(0.5);
    });
  });

  describe('3. Strategy Pattern & Orchestration', () => {
    let progressionService: SkillProgressionService;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SkillProgressionService,
          WeightStrategyFactory,
          SkillEngineCalibration,
          JournalWeightStrategy,
          ProjectWeightStrategy,
          QuizWeightStrategy,
        ],
      }).compile();

      progressionService = module.get<SkillProgressionService>(SkillProgressionService);
    });

    it('should orchestrate a complete progression calculation flow', () => {
      // Input: User current progress = 40.0, Project raw score = 90
      // Project Strategy config: alpha = 0.2, weight = 0.5
      // scaledScore = 90 * 0.5 = 45
      // newProgress = 40 + 0.2 * (45 - 40) = 40 + 0.2 * 5 = 41
      // contribution = 41 - 40 = 1
      const output = progressionService.computeProgress({
        userId: 'user-uuid',
        skillId: 'skill-uuid',
        sourceType: SourceType.PROJECT,
        sourceId: 'project-uuid',
        rawScore: 90,
        oldProgress: 40.0,
      });

      expect(output.weightedScore).toBeCloseTo(45);
      expect(output.newProgress).toBeCloseTo(41);
      expect(output.contribution).toBeCloseTo(1);
      expect(output.formulaVersion).toBe('v1.0');
    });
  });
});
