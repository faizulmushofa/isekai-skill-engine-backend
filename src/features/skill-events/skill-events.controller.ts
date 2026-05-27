import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkillEventsService } from './skill-events.service';

@ApiTags('Skill Events')
@ApiBearerAuth('access-token')
@Controller('skill-events')
export class SkillEventsController {
  constructor(private readonly skillEventsService: SkillEventsService) {}
}
