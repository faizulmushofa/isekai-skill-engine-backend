import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { SKILL_INIT_SKILLS_EXPLANATOR_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface SkillInitSkillsInput {
  careerName: string;
  discoveredTraits?: string[]; // Optional — from RIASEC discovery, if applicable
}

export class SkillInitSkillsPromptTemplate
  implements PromptTemplate<SkillInitSkillsInput>
{
  build(data: SkillInitSkillsInput): AiRequest {
    const traitsBlock =
      data.discoveredTraits && data.discoveredTraits.length > 0
        ? `\nUser Behavioral Traits (from discovery): ${data.discoveredTraits.join(', ')}`
        : '';

    const userPrompt = `Career Goal: ${data.careerName}${traitsBlock}\n\nGenerate the foundational root skill tree for this career.`;

    return {
      taskType: AiTaskType.SKILL_INIT_SKILLS_EXPLANATOR,
      systemPrompt: SKILL_INIT_SKILLS_EXPLANATOR_SYSTEM_PROMPT,
      userPrompt,
    };
  }
}

export const SkillInitSkillsPrompt = new SkillInitSkillsPromptTemplate();
