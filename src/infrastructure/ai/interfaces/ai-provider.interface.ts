export abstract class AiProvider {
  /**
   * Abstract generation contract executing Dynamic Provider routing.
   * Prompts and execution configurations are passed explicitly from the execution policy.
   */
  abstract generate(
    systemPrompt: string,
    userPrompt: string,
    config: {
      model: string;
      apiKey: string;
      responseSchema: any;
      temperature: number;
    },
  ): Promise<string>;
}
