import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { SKILL_INIT_CLASSIFICATION_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface SkillInitClassificationInput {
  userInput: string;
}

export class SkillInitClassificationPromptTemplate
  implements PromptTemplate<SkillInitClassificationInput>
{
  build(data: SkillInitClassificationInput): AiRequest {
    return {
      taskType: AiTaskType.SKILL_INIT_CLASSIFICATION,
      systemPrompt: SKILL_INIT_CLASSIFICATION_SYSTEM_PROMPT,
      userPrompt: `User Input: "${data.userInput}"`,
    };
  }
}

export const SkillInitClassificationPrompt =
  new SkillInitClassificationPromptTemplate();
