import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { LEARNING_EVIDENCE_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface LearningEvidenceInput {
  extractedText: string;
  sourceType: 'TEXT' | 'PDF' | 'DOCX' | 'MARKDOWN';
}

export class LearningEvidencePromptTemplate implements PromptTemplate<LearningEvidenceInput> {
  build(data: LearningEvidenceInput): AiRequest {
    const systemPrompt = LEARNING_EVIDENCE_SYSTEM_PROMPT;
    const userPrompt = `Source Type: ${data.sourceType}\nExtracted Text:\n---\n${data.extractedText}\n---`;

    return {
      taskType: AiTaskType.LEARNING_EVIDENCE,
      systemPrompt,
      userPrompt,
    };
  }
}

export const LearningEvidencePrompt = new LearningEvidencePromptTemplate();
