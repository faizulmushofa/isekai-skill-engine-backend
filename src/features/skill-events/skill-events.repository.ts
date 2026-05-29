import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SkillEvent, Prisma } from '@prisma/client';

@Injectable()
export class SkillEventsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.SkillEventCreateInput, tx?: Prisma.TransactionClient): Promise<SkillEvent> {
    const client = tx || this.prisma;
    return client.skillEvent.create({ data });
  }
}
