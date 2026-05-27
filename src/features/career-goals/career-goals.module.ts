import { Module } from '@nestjs/common';
import { CareerGoalsService } from './career-goals.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [CareerGoalsService],
  exports: [CareerGoalsService],
})
export class CareerGoalsModule {}
