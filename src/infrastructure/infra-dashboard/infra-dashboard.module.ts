import { Module } from '@nestjs/common';
import { InfraDashboardController } from './infra-dashboard.controller';
import { TokenTrackerModule } from '../token-management/token-tracker.module';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [TokenTrackerModule, AiModule, PrismaModule],
  controllers: [InfraDashboardController],
})
export class InfraDashboardModule {}
