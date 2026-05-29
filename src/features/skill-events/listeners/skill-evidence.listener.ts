import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SkillEvidenceGeneratedEvent } from '../../../shared/events/skill-evidence-generated.event';
import { SkillsService } from '../../skills/skills.service';
import { SkillEventsService } from '../skill-events.service';

@Injectable()
export class SkillEvidenceListener {
  private readonly logger = new Logger(SkillEvidenceListener.name);

  constructor(
    private readonly skillsService: SkillsService,
    private readonly skillEventsService: SkillEventsService,
  ) {}

  @OnEvent('skill.evidence.generated', { async: true })
  async handleSkillEvidenceGeneratedEvent(event: SkillEvidenceGeneratedEvent) {
    this.logger.log(`Received skill.evidence.generated for user ${event.userId} and topic ${event.skillNode}`);
    try {
      // 1. Resolve or create the abstract skillNode using the Graph Resolver
      const skillIds = await this.skillsService.findOrCreateMany([
        {
          name: event.skillNode,
          description: event.description,
        },
      ]);
      const skillId = skillIds[0];

      // 2. Trigger recursive Bayesian propagation up the skill tree ancestors
      await this.skillEventsService.recordEvent({
        userId: event.userId,
        skillId,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        rawScore: event.evidenceScore,
        reason: event.reason,
      });

      this.logger.log(`Successfully processed gamification event for user ${event.userId}`);
    } catch (error) {
      this.logger.error(`Failed to process gamification event: ${error.message}`, error.stack);
    }
  }
}
