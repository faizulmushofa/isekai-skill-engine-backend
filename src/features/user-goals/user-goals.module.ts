import { Module } from '@nestjs/common';
import { UserGoalsService } from './user-goals.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserGoalsService],
  exports: [UserGoalsService],
})
export class UserGoalsModule {}
