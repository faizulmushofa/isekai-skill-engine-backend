import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Project } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    if (!dto || !dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title tidak boleh kosong');
    }

    return this.prisma.project.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        repositoryUrl: dto.repositoryUrl?.trim() || null,
        reportContent: dto.reportContent?.trim() || null,
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Project> {
    if (!id) {
      throw new BadRequestException('ID project wajib diisi');
    }

    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project || project.userId !== userId) {
      throw new NotFoundException(`Project dengan ID '${id}' tidak ditemukan`);
    }

    return project;
  }
}
