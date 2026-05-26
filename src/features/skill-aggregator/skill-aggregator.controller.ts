import { Controller } from '@nestjs/common';
import { SkillAggregatorService } from './skill-aggregator.service';

@Controller('skill-aggregator')
export class SkillAggregatorController {
  constructor(
    private readonly skillAggregatorService: SkillAggregatorService,
  ) {}
}
