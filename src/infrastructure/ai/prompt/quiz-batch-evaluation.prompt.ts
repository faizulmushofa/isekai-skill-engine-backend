import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { QUIZ_BATCH_EVALUATION_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface QuizBatchEvaluationInput {
  skillNode: string;
  topic: string;
  qaPairs: Array<{
    questionId: string;
    questionText: string;
    answerText: string;
  }>;
}

export class QuizBatchEvaluationPromptTemplate implements PromptTemplate<QuizBatchEvaluationInput> {
  build(data: QuizBatchEvaluationInput): AiRequest {
    const systemPrompt = QUIZ_BATCH_EVALUATION_SYSTEM_PROMPT(data.topic, data.skillNode);
    const userPrompt = `Daftar Pertanyaan dan Jawaban Pengguna untuk Dievaluasi:\n${JSON.stringify(data.qaPairs, null, 2)}`;

    return {
      taskType: AiTaskType.QUIZ_BATCH_EVALUATION,
      systemPrompt,
      userPrompt,
    };
  }
}

export const QuizBatchEvaluationPrompt = new QuizBatchEvaluationPromptTemplate();
