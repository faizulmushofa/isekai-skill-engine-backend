import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JournalsService } from './journals.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Journal } from '@prisma/client';
import { QuotaService } from '../../infrastructure/quota/quota.service';

@ApiTags('Journals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('journals')
export class JournalsController {
  constructor(
    private readonly journalsService: JournalsService,
    private readonly quotaService: QuotaService,
  ) {}

  /**
   * Manual Text Ingestion Endpoint
   */
  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateJournalDto,
  ): Promise<Journal> {
    await this.quotaService.checkAndConsumeQuota(userId, 'JOURNAL');
    return this.journalsService.create(userId, dto);
  }

  /**
   * File Upload Ingestion Endpoint (Supports PDF/TXT)
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @CurrentUser() userId: string,
    @UploadedFile() file: any,
  ): Promise<Journal> {
    await this.quotaService.checkAndConsumeQuota(userId, 'JOURNAL');
    return this.journalsService.createFromFile(userId, file);
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

  @Delete(':id')
  async delete(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<any> {
    return this.journalsService.delete(userId, id);
  }
}
