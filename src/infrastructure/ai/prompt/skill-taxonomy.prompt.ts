import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { SKILL_TAXONOMY_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface SkillTaxonomyInput {
  newSkillName: string;
  existingSkills: Array<{ id: string; name: string }>;
}

export class SkillTaxonomyPromptTemplate implements PromptTemplate<SkillTaxonomyInput> {
  build(data: SkillTaxonomyInput): AiRequest {
    const existingSkillsJson = JSON.stringify(data.existingSkills, null, 2);
    const systemPrompt = SKILL_TAXONOMY_SYSTEM_PROMPT(data.newSkillName, existingSkillsJson);
    const userPrompt = `Petakan keahlian baru ini: "${data.newSkillName}"`;

    return {
      taskType: AiTaskType.SKILL_TAXONOMY_RESOLVER,
      systemPrompt,
      userPrompt,
    };
  }
}

export const SkillTaxonomyPrompt = new SkillTaxonomyPromptTemplate();
