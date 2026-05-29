import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Project, ExtractionCache, Prisma } from '@prisma/client';

@Injectable()
export class ProjectsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createProject(data: Prisma.ProjectCreateInput): Promise<Project> {
    return this.prisma.project.create({ data });
  }

  async findProjectsByUserId(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findProjectById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: { id },
    });
  }

  async updateProject(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async findExtractionCache(userId: string, repoUrl: string, commitHash: string): Promise<ExtractionCache | null> {
    return this.prisma.extractionCache.findUnique({
      where: {
        userId_repoUrl_commitHash: {
          userId,
          repoUrl,
          commitHash,
        },
      },
    });
  }

  async upsertExtractionCache(userId: string, repoUrl: string, commitHash: string, extractedSkills: any): Promise<ExtractionCache> {
    return this.prisma.extractionCache.upsert({
      where: {
        userId_repoUrl_commitHash: {
          userId,
          repoUrl,
          commitHash,
        },
      },
      create: {
        userId,
        repoUrl,
        commitHash,
        extractedSkills,
      },
      update: {
        extractedSkills,
      },
    });
  }

  async findActiveUserGoals(userId: string): Promise<any[]> {
    return this.prisma.userGoal.findMany({
      where: { userId },
      include: {
        careerGoal: {
          include: {
            careerGoalSkills: {
              include: { skill: true }
            }
          }
        }
      }
    });
  }
}
