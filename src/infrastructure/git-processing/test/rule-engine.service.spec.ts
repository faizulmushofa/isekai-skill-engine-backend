import { RuleEngineService } from '../services/rule-engine.service';

describe('RuleEngineService', () => {
  let service: RuleEngineService;

  beforeEach(() => {
    service = new RuleEngineService();
  });

  it('should extract flat RuleSignals from file paths without aggregation', () => {
    const files = ['src/auth/auth.controller.ts', 'src/auth/auth.service.ts'];
    const signals = service.extractSignals(files, '');

    // Expecting 2 signals for Auth (1 for controller path, 1 for service path)
    // + 1 signal for controller path (API Design), 1 signal for service path (Backend Arch)
    // No aggregation should happen in RuleEngine!
    expect(signals.length).toBe(4);

    const authSignals = signals.filter((s) => s.skill === 'Authentication Skill');
    expect(authSignals.length).toBe(2);
    expect(authSignals[0].filePath).toBe('src/auth/auth.controller.ts');
    expect(authSignals[1].filePath).toBe('src/auth/auth.service.ts');
  });

  it('should extract flat RuleSignals from git diff additions with additions/deletions counts per file', () => {
    const files: string[] = [];
    const rawDiff = `
diff --git a/src/security/jwt.ts b/src/security/jwt.ts
index 1234..5678 100644
--- a/src/security/jwt.ts
+++ b/src/security/jwt.ts
@@ -1,5 +1,7 @@
+ import * as jwt from 'jsonwebtoken';
+ const payload = jwt.verify(token);
- const oldCode = 0;
    `;

    const signals = service.extractSignals(files, rawDiff);

    expect(signals.length).toBe(1);
    expect(signals[0].skill).toBe('Security Skill');
    expect(signals[0].filePath).toBe('src/security/jwt.ts');
    expect(signals[0].matchType).toBe('content');
    expect(signals[0].additionsCount).toBe(2);
    expect(signals[0].deletionsCount).toBe(1);
  });
});
