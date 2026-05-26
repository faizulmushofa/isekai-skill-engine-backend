import { Module } from '@nestjs/common';
import { SkillEventsService } from './skill-events.service';
import { SkillEventsController } from './skill-events.controller';

@Module({
  controllers: [SkillEventsController],
  providers: [SkillEventsService],
})
export class SkillEventsModule {}
