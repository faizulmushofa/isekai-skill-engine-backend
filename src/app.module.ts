import { Module } from '@nestjs/common';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { SecurityModule } from './shared/security/security.module';
import { AuthModule } from './features/auth/auth.module';
import { UsersModule } from './features/users/users.module';
import { SkillsModule } from './features/skills/skills.module';
import { SkillEventsModule } from './features/skill-events/skill-events.module';
import { JournalsModule } from './features/journals/journals.module';
import { ProjectsModule } from './features/projects/projects.module';
import { QuizModule } from './features/quiz/quiz.module';
import { SkillAggregatorModule } from './features/skill-aggregator/skill-aggregator.module';
import { SkillInitModule } from './features/skill-init/skill-init.module';
import { ConfigModule } from './infrastructure/config/config.module';
import { AiModule } from './infrastructure/ai/ai.module';
import { ExtractionModule } from './infrastructure/extraction/extraction.module';
import { GitProcessingModule } from './infrastructure/git-processing/git-processing.module';

@Module({
  imports: [
    ConfigModule,
    AiModule,
    ExtractionModule,
    GitProcessingModule,
    PrismaModule,
    SecurityModule,
    AuthModule,
    UsersModule,
    SkillsModule,
    SkillEventsModule,
    JournalsModule,
    ProjectsModule,
    QuizModule,
    SkillAggregatorModule,
    SkillInitModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
