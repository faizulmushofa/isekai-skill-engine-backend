import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { SKILL_INIT_ADAPTIVE_QUESTION_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface SkillInitAdaptiveQuestionInput {
  previousAnswers: string[]; // All answers given so far in this session
  totalAnswers: number;      // How many answers collected so far (0..4)
}

export class SkillInitAdaptiveQuestionPromptTemplate
  implements PromptTemplate<SkillInitAdaptiveQuestionInput>
{
  build(data: SkillInitAdaptiveQuestionInput): AiRequest {
    const answersBlock =
      data.previousAnswers.length > 0
        ? `Previous Answers:\n${data.previousAnswers.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
        : 'No answers yet — this is the first question.';

    const userPrompt = `${answersBlock}\n\nAnswers collected so far: ${data.totalAnswers}/5\n\nGenerate the next adaptive discovery question.`;

    return {
      taskType: AiTaskType.SKILL_INIT_ADAPTIVE_QUESTION,
      systemPrompt: SKILL_INIT_ADAPTIVE_QUESTION_SYSTEM_PROMPT,
      userPrompt,
    };
  }
}

export const SkillInitAdaptiveQuestionPrompt =
  new SkillInitAdaptiveQuestionPromptTemplate();
