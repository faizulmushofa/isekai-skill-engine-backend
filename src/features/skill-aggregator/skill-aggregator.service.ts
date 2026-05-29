import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  GraphNode,
  GraphEdge,
  SkillGraphResponse,
  SkillTreeResponse,
} from './interfaces/skill-graph.interfaces';


@Injectable()
export class SkillAggregatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to fetch skills associated with the user, including all their taxonomy ancestors.
   * This ensures the graph and tree do not have broken links if a user only has a child skill.
   */
  private async getFilteredSkillsForUser(userId: string) {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, number>();
    const userSkillIds: string[] = [];
    for (const us of userSkills) {
      progressMap.set(us.skillId, us.progress);
      userSkillIds.push(us.skillId);
    }

    // Only fetch the skills explicitly owned by the user
    const skills = await this.prisma.skill.findMany({
      where: { id: { in: userSkillIds } },
      orderBy: { name: 'asc' },
    });

    return { skills, progressMap };
  }

  /**
   * Compiles and returns a Graph model of nodes and edges for the user.
   * Represents the complete skill network structure with current progress.
   */
  async getSkillGraph(userId: string): Promise<SkillGraphResponse> {
    const { skills, progressMap } = await this.getFilteredSkillsForUser(userId);

    // 3. Map nodes
    const nodes: GraphNode[] = skills.map((s) => ({
      id: s.id,
      name: s.name,
      progress: progressMap.get(s.id) || 0.0,
    }));

    const skillIdSet = new Set(skills.map(s => s.id));

    // 4. Map edges (parentId -> id) representing the directional taxomical hierarchy
    const edges: GraphEdge[] = [];
    for (const s of skills) {
      if (s.parentId && skillIdSet.has(s.parentId)) {
        edges.push({
          source: s.parentId,
          target: s.id,
        });
      }
    }

    return {
      nodes,
      edges,
    };
  }

  /**
   * Builds and returns a nested Hierarchical Tree JSON representation of skills for the user.
   */
  async getSkillTree(userId: string): Promise<SkillTreeResponse[]> {
    const { skills, progressMap } = await this.getFilteredSkillsForUser(userId);

    const skillIdSet = new Set(skills.map(s => s.id));

    // 3. Build recursive trees starting from root skills (parentId = null or parent not owned by user)
    const rootSkills = skills.filter((s) => !s.parentId || !skillIdSet.has(s.parentId));
    const tree: SkillTreeResponse[] = [];

    for (const root of rootSkills) {
      tree.push(this.buildSubTree(root.id, skills, progressMap));
    }

    return tree;
  }

  /**
   * Helper that builds subtrees recursively.
   */
  private buildSubTree(
    skillId: string,
    allSkills: any[],
    progressMap: Map<string, number>,
  ): SkillTreeResponse {
    const current = allSkills.find((s) => s.id === skillId);
    const children = allSkills.filter((s) => s.parentId === skillId);

    const childTrees: SkillTreeResponse[] = [];
    for (const child of children) {
      childTrees.push(this.buildSubTree(child.id, allSkills, progressMap));
    }

    return {
      id: current.id,
      name: current.name,
      progress: progressMap.get(current.id) || 0.0,
      children: childTrees,
    };
  }

  /**
   * Returns a flat list of skills with user's progress.
   */
  async getSkillProgress(userId: string): Promise<Array<{ skillId: string; name: string; progress: number }>> {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, number>();
    const skillIds: string[] = [];
    for (const us of userSkills) {
      progressMap.set(us.skillId, us.progress);
      skillIds.push(us.skillId);
    }

    const skills = await this.prisma.skill.findMany({
      where: { id: { in: skillIds } },
      orderBy: { name: 'asc' },
    });

    return skills.map((s) => ({
      skillId: s.id,
      name: s.name,
      progress: progressMap.get(s.id) || 0.0,
    }));
  }
}
