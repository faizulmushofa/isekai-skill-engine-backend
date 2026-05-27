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
   * Compiles and returns a Graph model of nodes and edges for the user.
   * Represents the complete skill network structure with current progress.
   */
  async getSkillGraph(userId: string): Promise<SkillGraphResponse> {
    // 1. Fetch all skills in the taxonomy database
    const skills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });

    // 2. Fetch all user skill progress aggregates
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, number>();
    for (const us of userSkills) {
      progressMap.set(us.skillId, us.progress);
    }

    // 3. Map nodes
    const nodes: GraphNode[] = skills.map((s) => ({
      id: s.id,
      name: s.name,
      progress: progressMap.get(s.id) || 0.0,
    }));

    // 4. Map edges (parentId -> id) representing the directional taxomical hierarchy
    const edges: GraphEdge[] = [];
    for (const s of skills) {
      if (s.parentId) {
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
    // 1. Fetch all skills
    const skills = await this.prisma.skill.findMany();

    // 2. Fetch all user progress aggregates
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, number>();
    for (const us of userSkills) {
      progressMap.set(us.skillId, us.progress);
    }

    // 3. Build recursive trees starting from root skills (parentId = null)
    const rootSkills = skills.filter((s) => !s.parentId);
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
    const skills = await this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });

    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId },
    });

    const progressMap = new Map<string, number>();
    for (const us of userSkills) {
      progressMap.set(us.skillId, us.progress);
    }

    return skills.map((s) => ({
      skillId: s.id,
      name: s.name,
      progress: progressMap.get(s.id) || 0.0,
    }));
  }
}
