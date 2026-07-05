import { SourceType } from '@prisma/client';

export class SkillEvidenceGeneratedEvent {
  constructor(
    public readonly userId: string,
    public readonly skillNode: string, // the abstract topic/name
    public readonly description: string,
    public readonly sourceType: SourceType,
    public readonly sourceId: string,
    public readonly evidenceScore: number,
    public readonly reason: string,
    public readonly parentId?: string | null,
  ) {}
}
