import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface SkillInput {
  name: string;
  description: string;
}

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Batch find-or-create skills by name.
   * Returns array of skill IDs in the same order as input.
   */
  async findOrCreateMany(skills: SkillInput[]): Promise<string[]> {
    const skillIds: string[] = [];

    for (const skill of skills) {
      const existing = await this.prisma.skill.findFirst({
        where: { name: skill.name },
        select: { id: true },
      });

      if (existing) {
        skillIds.push(existing.id);
        continue;
      }

      const created = await this.prisma.skill.create({
        data: {
          name: skill.name,
          description: skill.description,
          parentId: null, // Root skill
        },
        select: { id: true },
      });
      skillIds.push(created.id);
    }

    return skillIds;
  }
}

