import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SkillAggregatorService {
  constructor(private readonly prisma: PrismaService) {}
}
