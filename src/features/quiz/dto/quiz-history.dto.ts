export class QuizAnswerDto {
  questionId: string;
  answerText: string;
  score: number;
  isCorrect: boolean;
  question: {
    questionText: string;
  };
}

export class QuizHistoryDto {
  id: string;
  quizId: string;
  score: number;
  createdAt: Date;
  quiz: {
    title: string;
    topic: string;
    difficulty: string;
  };
  quizAnswers: QuizAnswerDto[];
  skillEvents: Array<{
    id: string;
    skillId: string;
    rawScore: number;
    skill: {
      name: string;
    };
  }>;
}
