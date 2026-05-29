import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { PROJECT_EVIDENCE_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface ProjectEvidenceInput {
  title: string;
  description: string;
  technologies?: string[];
  repoUrl?: string;
  validParentSkills: Array<{ id: string; name: string }>;
}

export class ProjectEvidencePromptTemplate implements PromptTemplate<ProjectEvidenceInput> {
  build(data: ProjectEvidenceInput): AiRequest {
    const parentSkillsContext = data.validParentSkills.length > 0
      ? `DAFTAR KATEGORI KEAHLIAN VALID (PARENT SKILLS):\n${data.validParentSkills.map(s => `- ID: ${s.id} | Nama: ${s.name}`).join('\n')}\n\nPENTING: Setiap skill yang kamu ekstrak WAJIB dipetakan ke salah satu ID kategori di atas (sebagai parentId). Jika skill yang diekstrak benar-benar tidak ada hubungannya sama sekali dengan semua kategori di atas, JANGAN masukkan skill tersebut ke dalam hasil ekstraksi (abaikan saja).`
      : 'TIDAK ADA KATEGORI KEAHLIAN (Kembalikan null untuk parentId semua skill).';

    const systemPrompt = PROJECT_EVIDENCE_SYSTEM_PROMPT;
    const userPrompt = `Project Title: ${data.title}\nProject Description:\n---\n${data.description}\n---\nTechnologies: ${data.technologies ? data.technologies.join(', ') : 'None specified'}\nRepository URL: ${data.repoUrl || 'None specified'}\n\n${parentSkillsContext}`;

    return {
      taskType: AiTaskType.PROJECT_EVIDENCE,
      systemPrompt,
      userPrompt,
    };
  }
}

export const ProjectEvidencePrompt = new ProjectEvidencePromptTemplate();
