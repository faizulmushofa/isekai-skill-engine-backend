import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Journal } from '@prisma/client';

@ApiTags('Journals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('journals')
export class JournalsController {
  constructor(private readonly journalsService: JournalsService) {}

  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateJournalDto,
  ): Promise<Journal> {
    return this.journalsService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() userId: string): Promise<Journal[]> {
    return this.journalsService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<Journal> {
    return this.journalsService.findOne(userId, id);
  }
}
