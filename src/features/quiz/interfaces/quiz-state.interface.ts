export interface QuizStateResponse {
  state: string;
  message: string;
  data?: any;
}

export interface AdaptiveQuizSession {
  attemptId: string;
  topic: string;
  skillNode: string;
  currentQuestionIndex: number;
  questionIds: string[];
  answers: Array<{ questionId: string; answerText: string }>;
}

