export class SubmitAnswerCommand {
  constructor(
    public readonly userId: string,
    public readonly answerText: string,
  ) {}
}
