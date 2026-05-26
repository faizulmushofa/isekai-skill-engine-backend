import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SkillEventsService {
  constructor(private readonly prisma: PrismaService) {}
}
