import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SkillTaxonomyService } from './services/skill-taxonomy.service';

export interface SkillInput {
  name: string;
  description: string;
}

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomyService: SkillTaxonomyService,
  ) {}

  /**
   * Batch find-or-create skills by name.
   * Leverages the Taxonomy Resolver to automatically assign parent-child graph edges.
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

      // Resolve the parent ID dynamically using AI
      const parentId = await this.taxonomyService.resolveParentId(skill.name);

      const created = await this.prisma.skill.create({
        data: {
          name: skill.name,
          description: skill.description,
          parentId, // Configured with AI-driven parent-child mapping
        },
        select: { id: true },
      });
      
      skillIds.push(created.id);
    }

    return skillIds;
  }
}
