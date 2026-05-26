import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { SecurityModule } from './shared/security/security.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { SkillsModule } from './features/skills/skills.module';
import { SkillEventsModule } from './features/skill-events/skill-events.module';
import { JournalsModule } from './features/journals/journals.module';
import { SkillAggregatorModule } from './features/skill-aggregator/skill-aggregator.module';

@Module({
  imports: [
    PrismaModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    SkillsModule,
    SkillEventsModule,
    JournalsModule,
    SkillAggregatorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
