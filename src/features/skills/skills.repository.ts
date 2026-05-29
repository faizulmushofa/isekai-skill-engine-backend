import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Prisma, Skill } from '@prisma/client';

@Injectable()
export class SkillsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByName(name: string): Promise<{ id: string } | null> {
    return this.prisma.skill.findFirst({
      where: { name },
      select: { id: true },
    });
  }

  async create(data: Prisma.SkillCreateInput): Promise<{ id: string }> {
    return this.prisma.skill.create({
      data,
      select: { id: true },
    });
  }

  async findAllForTaxonomy(): Promise<{ id: string; name: string }[]> {
    return this.prisma.skill.findMany({
      select: {
        id: true,
        name: true,
      },
    });
  }
}
