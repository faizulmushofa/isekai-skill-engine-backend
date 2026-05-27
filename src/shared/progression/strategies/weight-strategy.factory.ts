import { Injectable } from '@nestjs/common';
import { SourceType } from '@prisma/client';
import { EvidenceWeightStrategy } from './evidence-weight.strategy';
import { JournalWeightStrategy } from './journal-weight.strategy';
import { ProjectWeightStrategy } from './project-weight.strategy';
import { QuizWeightStrategy } from './quiz-weight.strategy';

@Injectable()
export class WeightStrategyFactory {
  private readonly strategies = new Map<SourceType, EvidenceWeightStrategy>();

  constructor(
    private readonly journalStrategy: JournalWeightStrategy,
    private readonly projectStrategy: ProjectWeightStrategy,
    private readonly quizStrategy: QuizWeightStrategy,
  ) {
    this.strategies.set(SourceType.JOURNAL, this.journalStrategy);
    this.strategies.set(SourceType.PROJECT, this.projectStrategy);
    this.strategies.set(SourceType.QUIZ, this.quizStrategy);
  }

  /**
   * Resolves the concrete weighting strategy for a given learning source.
   */
  getStrategy(sourceType: SourceType): EvidenceWeightStrategy {
    const strategy = this.strategies.get(sourceType);
    if (!strategy) {
      throw new Error(`Unsupported weight strategy for source type: ${sourceType}`);
    }
    return strategy;
  }
}
