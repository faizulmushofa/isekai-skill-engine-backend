import { Injectable } from '@nestjs/common';
import { AdaptiveQuizSession } from '../interfaces/quiz-state.interface';

@Injectable()
export class QuizSessionStore {
  private readonly sessions = new Map<string, AdaptiveQuizSession>();

  get(userId: string): AdaptiveQuizSession | undefined {
    return this.sessions.get(userId);
  }

  set(userId: string, session: AdaptiveQuizSession): void {
    this.sessions.set(userId, session);
  }

  delete(userId: string): void {
    this.sessions.delete(userId);
  }
}
