import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class JournalsService {
  constructor(private readonly prisma: PrismaService) {}
}
