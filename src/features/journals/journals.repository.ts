import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Journal, Prisma, SourceType } from '@prisma/client';

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

  async deleteJournal(id: string): Promise<Journal> {
    return this.prisma.journal.delete({
      where: { id },
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

  async findSkillEventsForJournal(journalId: string): Promise<any[]> {
    return this.prisma.skillEvent.findMany({
      where: {
        sourceId: journalId,
        sourceType: SourceType.JOURNAL,
      },
      include: {
        skill: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
