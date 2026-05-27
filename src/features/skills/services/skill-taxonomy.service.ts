import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { AiService } from '../../../infrastructure/ai/ai.service';
import { SkillTaxonomyPrompt } from '../../../infrastructure/ai/prompt/skill-taxonomy.prompt';

@Injectable()
export class SkillTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  /**
   * Resolves the best parent skill ID for a newly discovered skill.
   * Leverages Gemini to perform a semantic taxonomy match against all existing skills.
   */
  async resolveParentId(newSkillName: string): Promise<string | null> {
    // 1. Fetch all candidate skills currently in the database
    const existingSkills = await this.prisma.skill.findMany({
      select: {
        id: true,
        name: true,
      },
    });

    // If database is completely empty, it must be a root skill
    if (existingSkills.length === 0) {
      return null;
    }

    try {
      // 2. Build prompt and invoke AI to resolve parent classification
      const promptRequest = SkillTaxonomyPrompt.build({
        newSkillName,
        existingSkills,
      });

      const response = await this.aiService.generate<{
        parentId: string | null;
        reason: string;
      }>(promptRequest);

      // 3. Guarantee data integrity: verify selected parentId exists
      if (response && response.parentId) {
        const parentExists = existingSkills.some((s) => s.id === response.parentId);
        return parentExists ? response.parentId : null;
      }

      return null;
    } catch (error) {
      // Fallback to Root Skill in case of AI failures to ensure robust service operation
      return null;
    }
  }
}
