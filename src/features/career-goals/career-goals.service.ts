import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CareerGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find an existing CareerGoal by name, or create it if not found.
   * @returns The CareerGoal ID
   */
  async findOrCreate(careerName: string): Promise<string> {
    const existing = await this.prisma.careerGoal.findFirst({
      where: { name: careerName },
      select: { id: true },
    });

    if (existing) return existing.id;

    const created = await this.prisma.careerGoal.create({
      data: { name: careerName },
      select: { id: true },
    });

    return created.id;
  }
}
