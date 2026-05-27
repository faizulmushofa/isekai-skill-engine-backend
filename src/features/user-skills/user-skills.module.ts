import { Module } from '@nestjs/common';
import { UserSkillsService } from './user-skills.service';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [UserSkillsService],
  exports: [UserSkillsService],
})
export class UserSkillsModule {}
