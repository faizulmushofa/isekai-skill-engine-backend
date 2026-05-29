import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Journal, Prisma } from '@prisma/client';

@Injectable()
export class JournalsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.JournalCreateInput): Promise<Journal> {
    return this.prisma.journal.create({ data });
  }

  async findByUserId(userId: string): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<Journal | null> {
    return this.prisma.journal.findUnique({
      where: { id },
    });
  }
}
