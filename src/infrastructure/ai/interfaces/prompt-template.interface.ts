import { AiRequest } from './ai-request.interface';

export interface PromptTemplate<T> {
  build(data: T): AiRequest;
}
