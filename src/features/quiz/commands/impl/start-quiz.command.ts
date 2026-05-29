export class StartQuizCommand {
  constructor(
    public readonly userId: string,
    public readonly topic: string,
  ) {}
}
