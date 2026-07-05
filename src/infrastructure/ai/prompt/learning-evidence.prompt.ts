import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { LEARNING_EVIDENCE_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface LearningEvidenceInput {
  extractedText: string;
  sourceType: 'TEXT' | 'PDF' | 'DOCX' | 'MARKDOWN';
  validParentSkills?: Array<{ id: string; name: string }>;
}

export class LearningEvidencePromptTemplate implements PromptTemplate<LearningEvidenceInput> {
  build(data: LearningEvidenceInput): AiRequest {
    const parentSkillsContext = data.validParentSkills && data.validParentSkills.length > 0
      ? `DAFTAR KATEGORI KEAHLIAN VALID (PARENT SKILLS):\n${data.validParentSkills.map(s => `- ID: ${s.id} | Nama: ${s.name}`).join('\n')}\n\nPENTING: Setiap skill yang kamu ekstrak WAJIB dipetakan ke salah satu ID kategori di atas (sebagai parentId). Jika skill yang diekstrak benar-benar tidak ada hubungannya sama sekali dengan semua kategori di atas, JANGAN masukkan skill tersebut ke dalam hasil ekstraksi (abaikan saja).`
      : 'TIDAK ADA KATEGORI KEAHLIAN (Kembalikan null untuk parentId semua skill).';

    const systemPrompt = LEARNING_EVIDENCE_SYSTEM_PROMPT;
    const userPrompt = `Source Type: ${data.sourceType}\nExtracted Text:\n---\n${data.extractedText}\n---\n\n${parentSkillsContext}`;

    return {
      taskType: AiTaskType.LEARNING_EVIDENCE,
      systemPrompt,
      userPrompt,
    };
  }
}

export const LearningEvidencePrompt = new LearningEvidencePromptTemplate();
