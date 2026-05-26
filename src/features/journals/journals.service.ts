import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { Journal } from '@prisma/client';
import { CreateJournalDto } from './dto/create-journal.dto';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateJournalDto): Promise<Journal> {
    if (!dto || !dto.title || !dto.title.trim()) {
      throw new BadRequestException('Title tidak boleh kosong');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Content tidak boleh kosong');
    }

    return this.prisma.journal.create({
      data: {
        title: dto.title.trim(),
        content: dto.content.trim(),
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<Journal[]> {
    return this.prisma.journal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Journal> {
    if (!id) {
      throw new BadRequestException('ID journal wajib diisi');
    }

    const journal = await this.prisma.journal.findUnique({
      where: { id },
    });

    if (!journal || journal.userId !== userId) {
      throw new NotFoundException(`Journal dengan ID '${id}' tidak ditemukan`);
    }

    return journal;
  }
}
