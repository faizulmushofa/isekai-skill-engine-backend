export class SelectModeCommand {
  constructor(
    public readonly userId: string,
    public readonly mode: '1' | '2',
    public readonly topic: string,
  ) {}
}
