import { Controller } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SkillsService } from './skills.service';

@ApiTags('Skills')
@ApiBearerAuth('access-token')
@Controller('skills')
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}
}
