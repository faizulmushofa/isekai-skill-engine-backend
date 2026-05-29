import { PromptTemplate } from '../interfaces/prompt-template.interface';
import { AiRequest } from '../interfaces/ai-request.interface';
import { AiTaskType } from '../enums/ai-task-type.enum';
import { BEHAVIORAL_CAREER_ALIGNMENT_SYSTEM_PROMPT } from '../constants/ai-prompts.constant';

export interface BehavioralCareerAlignmentInput {
  hobbies: string[];
  habits: string[];
  interests: string[];
  preferredActivities: string[];
  personalityTraits?: string[];
}

export class BehavioralCareerAlignmentPromptTemplate implements PromptTemplate<BehavioralCareerAlignmentInput> {
  build(data: BehavioralCareerAlignmentInput): AiRequest {
    const systemPrompt = BEHAVIORAL_CAREER_ALIGNMENT_SYSTEM_PROMPT;
    const userPrompt = `Hobbies: ${data.hobbies.join(', ')}\nHabits: ${data.habits.join(', ')}\nInterests: ${data.interests.join(', ')}\nPreferred Activities: ${data.preferredActivities.join(', ')}\nPersonality Traits: ${data.personalityTraits ? data.personalityTraits.join(', ') : 'None specified'}`;

    return {
      taskType: AiTaskType.BEHAVIORAL_CAREER_ALIGNMENT,
      systemPrompt,
      userPrompt,
    };
  }
}

export const BehavioralCareerAlignmentPrompt = new BehavioralCareerAlignmentPromptTemplate();
