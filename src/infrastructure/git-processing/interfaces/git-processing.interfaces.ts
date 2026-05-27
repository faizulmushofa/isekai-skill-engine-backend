export interface RepoContext {
  readmeContent: string;
  manifests: Record<string, any>;
  fileTree: string[];
  dependencies: string[];
  entryPoints: string[];
}

export interface RepoIntelligenceProfile {
  language: string[];
  framework: string[];
  database: string[];
  architecture: {
    type: string;
    confidence: number;
    reason: string;
  };
}

export interface InitContext {
  repoId: string;
  repoUrl: string;
  repoContext: RepoContext;
  repoIntelligence: RepoIntelligenceProfile;
  fileStructure: string[];
  dependencies: string[];
  projectSummary: string; // RAW README ONLY
}

export interface RuleSignal {
  skill: string;
  confidence: number;
  reason: string;
  filePath: string;
  matchType: 'path' | 'content';
  additionsCount?: number;
  deletionsCount?: number;
}

export interface SkillSignal {
  skill: string;
  confidence: number;
  reason: string; // Combined reason string
  strength: number;
  coverage: number;
  intensity: number;
  reasons: string[];
}

export interface CommitContext {
  commitHash: string;
  repoId: string;
  filesChanged: string[];
  diffSummary: {
    additions: number;
    deletions: number;
  };
  rawDiff: string;
  ruleSignals: SkillSignal[]; // Computed SkillSignal array
}

export interface AIInputPayload {
  initContext?: InitContext;
  commitContext?: CommitContext;
  repoId: string;
  repoIntelligence: RepoIntelligenceProfile;
  signalData: {
    fileStructure: string[];
    dependencies: string[];
    ruleSignals: SkillSignal[]; // Satisfies user structure contract but maps to aggregated signals
    diffSummary?: {
      additions: number;
      deletions: number;
    };
  };
  metadata: {
    lastCommitHash: string;
    timestamp: string;
  };
}

export interface RepoIndex {
  repoId: string;
  repoUrl: string;
  lastCommitHash: string;
  status: 'READY' | 'INITIALIZING' | 'ERROR';
  updatedAt: string;
}
