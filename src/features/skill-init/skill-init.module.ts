import { Module } from '@nestjs/common';
import { SkillInitService } from './skill-init.service';
import { SkillInitController } from './skill-init.controller';
import { AiModule } from '../../infrastructure/ai/ai.module';
import { SkillsModule } from '../skills/skills.module';
import { CareerGoalsModule } from '../career-goals/career-goals.module';
import { UserGoalsModule } from '../user-goals/user-goals.module';
import { CareerGoalSkillsModule } from '../career-goal-skills/career-goal-skills.module';
import { UserSkillsModule } from '../user-skills/user-skills.module';
import { JwtModule } from '../../infrastructure/jwt/jwt.module';

@Module({
  imports: [
    AiModule,
    SkillsModule,
    CareerGoalsModule,
    UserGoalsModule,
    CareerGoalSkillsModule,
    UserSkillsModule,
    JwtModule,
  ],
  controllers: [SkillInitController],
  providers: [SkillInitService],
})
export class SkillInitModule {}
