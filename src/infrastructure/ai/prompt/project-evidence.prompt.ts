import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { PROJECT_EVIDENCE_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface ProjectEvidenceInput {
  title: string;
  description: string;
  technologies?: string[];
  repoUrl?: string;
}

export class ProjectEvidencePromptTemplate implements PromptTemplate<ProjectEvidenceInput> {
  build(data: ProjectEvidenceInput): AiRequest {
    const systemPrompt = PROJECT_EVIDENCE_SYSTEM_PROMPT;
    const userPrompt = `Project Title: ${data.title}\nProject Description:\n---\n${data.description}\n---\nTechnologies: ${data.technologies ? data.technologies.join(', ') : 'None specified'}\nRepository URL: ${data.repoUrl || 'None specified'}`;

    return {
      taskType: AiTaskType.PROJECT_EVIDENCE,
      systemPrompt,
      userPrompt,
    };
  }
}

export const ProjectEvidencePrompt = new ProjectEvidencePromptTemplate();
