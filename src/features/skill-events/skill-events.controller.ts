import { Controller } from '@nestjs/common';
import { SkillEventsService } from './skill-events.service';

@Controller('skill-events')
export class SkillEventsController {
  constructor(private readonly skillEventsService: SkillEventsService) {}
}
