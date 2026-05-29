import { AiTaskType } from '../enums/ai-task-type.enum';

export interface AiRequest {
  taskType: AiTaskType;
  systemPrompt: string;
  userPrompt: string;
  userId?: string;
}
