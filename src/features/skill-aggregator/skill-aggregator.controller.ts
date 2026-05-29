import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkillAggregatorService } from './skill-aggregator.service';
import { SkillGraphResponse, SkillTreeResponse } from './interfaces/skill-graph.interfaces';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';


@ApiTags('Skill Aggregator')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('skill-aggregator')
export class SkillAggregatorController {
  constructor(
    private readonly skillAggregatorService: SkillAggregatorService,
  ) {}

  @Get('graph')
  async getSkillGraph(@CurrentUser() userId: string): Promise<SkillGraphResponse> {
    return this.skillAggregatorService.getSkillGraph(userId);
  }

  @Get('tree')
  async getSkillTree(@CurrentUser() userId: string): Promise<SkillTreeResponse[]> {
    return this.skillAggregatorService.getSkillTree(userId);
  }

  @Get('progress')
  async getSkillProgress(
    @CurrentUser() userId: string,
  ): Promise<Array<{ skillId: string; name: string; progress: number }>> {
    return this.skillAggregatorService.getSkillProgress(userId);
  }
}
