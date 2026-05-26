import { Injectable } from '@nestjs/common';

@Injectable()
export class QuizEngine {
  /**
   * Generates a mock quiz structure with questions for the given topic.
   */
  generateQuiz(topic: string) {
    const formattedTopic = topic.trim();
    return {
      title: `${formattedTopic} Assessment`,
      description: `A short test of your knowledge about ${formattedTopic}.`,
      difficulty: 'MEDIUM',
      questions: [
        {
          questionText: `What is the core design philosophy of ${formattedTopic}?`,
          type: 'A', // Stores the correct answer key in the type field
        },
        {
          questionText: `Which of the following is considered a best practice in ${formattedTopic}?`,
          type: 'B', // Stores the correct answer key in the type field
        },
        {
          questionText: `What is a common pitfall to avoid in ${formattedTopic}?`,
          type: 'C', // Stores the correct answer key in the type field
        },
      ],
    };
  }

  /**
   * Evaluates the correctness of the user's submitted answer.
   */
  evaluateAnswer(submittedAnswer: string, correctAnswerKey: string): boolean {
    if (!submittedAnswer || !correctAnswerKey) return false;
    return (
      submittedAnswer.trim().toUpperCase() ===
      correctAnswerKey.trim().toUpperCase()
    );
  }

  /**
   * Calculates the sum of correct answers.
   */
  calculateScore(answers: { isCorrect: boolean | null }[]): number {
    return answers.reduce((total, ans) => total + (ans.isCorrect ? 1 : 0), 0);
  }
}
