import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { OrchestrateProjectDto } from './dto/orchestrate-project.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import { Project } from '@prisma/client';
import { QuotaService } from '../../infrastructure/quota/quota.service';

@ApiTags('Projects')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly quotaService: QuotaService,
  ) {}

  @Post()
  async create(
    @CurrentUser() userId: string,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(userId, dto);
  }

  @Get()
  async findAll(@CurrentUser() userId: string): Promise<Project[]> {
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() userId: string,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.findOne(userId, id);
  }

  /**
   * Orchestrates Project Skill progression.
   * Performs fully-automated backend Git repository scans/clones and parses file uploads.
   */
  @Post(':id/orchestrate')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async orchestrate(
    @CurrentUser() userId: string,
    @Param('id') projectId: string,
    @Body() dto: OrchestrateProjectDto,
    @UploadedFile() file?: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<any> {
    await this.quotaService.checkAndConsumeQuota(userId, 'PROJECT');
    return this.projectsService.orchestrateProjectSkills(
      userId,
      projectId,
      dto,
      file,
    );
  }
}
