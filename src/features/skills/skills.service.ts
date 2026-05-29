import { Injectable } from '@nestjs/common';
import { SkillsRepository } from './skills.repository';
import { SkillTaxonomyService } from './services/skill-taxonomy.service';

export interface SkillInput {
  name: string;
  description: string;
  parentId?: string | null;
}

@Injectable()
export class SkillsService {
  constructor(
    private readonly skillsRepository: SkillsRepository,
    private readonly taxonomyService: SkillTaxonomyService,
  ) {}

  /**
   * Batch find-or-create skills by name.
   * Leverages the Taxonomy Resolver to automatically assign parent-child graph edges, unless parentId is explicitly provided.
   * Returns array of skill IDs in the same order as input.
   */
  async findOrCreateMany(skills: SkillInput[]): Promise<string[]> {
    const skillIds: string[] = [];

    for (const skill of skills) {
      const existing = await this.skillsRepository.findByName(skill.name);

      if (existing) {
        skillIds.push(existing.id);
        continue;
      }

      // Bypass taxonomy service if parentId is explicitly provided (even if null)
      const parentId = skill.parentId !== undefined
        ? skill.parentId
        : await this.taxonomyService.resolveParentId(skill.name);

      const created = await this.skillsRepository.create({
        name: skill.name,
        description: skill.description,
        parent: parentId ? { connect: { id: parentId } } : undefined,
      });
      
      skillIds.push(created.id);
    }

    return skillIds;
  }
}
