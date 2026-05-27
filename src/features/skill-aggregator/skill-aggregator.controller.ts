import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkillAggregatorService } from './skill-aggregator.service';

@ApiTags('Skill Aggregator')
@ApiBearerAuth('access-token')
@Controller('skill-aggregator')
export class SkillAggregatorController {
  constructor(
    private readonly skillAggregatorService: SkillAggregatorService,
  ) {}
}
