import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { ASSESSMENT_GENERATOR_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface AssessmentGeneratorInput {
  skill: string;
  difficulty: string;
}

export class AssessmentGeneratorPromptTemplate implements PromptTemplate<AssessmentGeneratorInput> {
  build(data: AssessmentGeneratorInput): AiRequest {
    const systemPrompt = ASSESSMENT_GENERATOR_SYSTEM_PROMPT;
    const userPrompt = `Target Skill: ${data.skill}\nDifficulty Level: ${data.difficulty}`;

    return {
      taskType: AiTaskType.ASSESSMENT_GENERATOR,
      systemPrompt,
      userPrompt,
    };
  }
}

export const AssessmentGeneratorPrompt = new AssessmentGeneratorPromptTemplate();
