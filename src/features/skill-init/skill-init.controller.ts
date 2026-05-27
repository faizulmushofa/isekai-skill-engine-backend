import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { SkillInitService } from './skill-init.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../shared/decorators/current-user.decorator';
import {
  SkillInitStartResponse,
  SkillInitAnswerResponse,
  SkillInitSelectCareerResponse,
} from './interfaces/skill-init.interfaces';

export class StartSkillInitDto {
  @ApiProperty({
    example: 'saya ingin menjadi backend engineer',
    description: 'Pernyataan karier atau minat dari pengguna. Bisa spesifik, samar, atau kosong.',
  })
  userInput: string;
}

export class AnswerSkillInitDto {
  @ApiProperty({
    example: 'Saya suka memecahkan masalah teknis yang kompleks dan membangun sistem',
    description: 'Jawaban pengguna terhadap pertanyaan RIASEC discovery.',
  })
  answer: string;
}

export class SelectCareerDto {
  @ApiProperty({
    example: 'Backend Engineer',
    description: 'Nama karier yang dipilih dari opsi yang disajikan sistem.',
  })
  careerName: string;
}

@ApiTags('Skill-Init')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('skill-init')
export class SkillInitController {
  constructor(private readonly skillInitService: SkillInitService) {}

  /**
   * POST /skill-init/start
   */
  @Post('start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Mulai sesi inisialisasi keahlian',
    description:
      'Mengklasifikasikan intent pengguna (DIRECT_GOAL / VAGUE_GOAL / EMPTY). ' +
      'Jika DIRECT_GOAL → langsung ke pemilihan karier. ' +
      'Jika VAGUE/EMPTY → mulai kuis RIASEC adaptif.',
  })
  @ApiResponse({ status: 200, description: 'Sesi dimulai, mengembalikan step awal dan pertanyaan atau opsi karier' })
  @ApiResponse({ status: 409, description: 'Sesi skill-init sudah aktif untuk user ini' })
  async start(
    @CurrentUser() userId: string,
    @Body() dto: StartSkillInitDto,
  ): Promise<SkillInitStartResponse> {
    return this.skillInitService.start(userId, dto.userInput);
  }

  /**
   * POST /skill-init/answer
   */
  @Post('answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Kirim jawaban kuis RIASEC discovery',
    description:
      'Mengirimkan jawaban untuk pertanyaan RIASEC yang sedang aktif. ' +
      'Sistem akan membalas dengan pertanyaan berikutnya atau opsi karier jika discovery selesai.',
  })
  @ApiResponse({ status: 200, description: 'Jawaban diterima. Mengembalikan pertanyaan berikutnya atau opsi karier.' })
  @ApiResponse({ status: 400, description: 'Tidak ada sesi aktif atau sesi tidak dalam step DISCOVERY' })
  async answer(
    @CurrentUser() userId: string,
    @Body() dto: AnswerSkillInitDto,
  ): Promise<SkillInitAnswerResponse> {
    return this.skillInitService.answer(userId, dto.answer);
  }

  /**
   * POST /skill-init/select-career
   */
  @Post('select-career')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Pilih karier dan finalisasi inisialisasi skill',
    description:
      'Memilih karier dari opsi yang disajikan. Sistem akan generate root skills, ' +
      'lalu menyimpan CareerGoal → UserGoal → Skills → CareerGoalSkills → UserSkills ke database.',
  })
  @ApiResponse({ status: 200, description: 'Inisialisasi selesai. Mengembalikan daftar root skills yang sudah disimpan.' })
  @ApiResponse({ status: 400, description: 'Karier tidak ada dalam opsi atau sesi tidak dalam step CAREER_SELECTION' })
  async selectCareer(
    @CurrentUser() userId: string,
    @Body() dto: SelectCareerDto,
  ): Promise<SkillInitSelectCareerResponse> {
    return this.skillInitService.selectCareer(userId, dto.careerName);
  }

  /**
   * GET /skill-init/status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Cek status sesi skill-init yang sedang aktif',
    description: 'Mengembalikan step sesi saat ini (CLASSIFY / DISCOVERY / CAREER_SELECTION / SKILLS_GENERATION / DONE), atau null jika tidak ada sesi.',
  })
  @ApiResponse({ status: 200, description: 'Status sesi saat ini' })
  getStatus(@CurrentUser() userId: string): { step: string | null } {
    const step = this.skillInitService.getSessionStatus(userId);
    return { step };
  }

  /**
   * DELETE /skill-init/reset
   */
  @Delete('reset')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Reset / batalkan sesi skill-init yang sedang aktif',
    description: 'Menghapus sesi dari memori. Pengguna dapat memulai sesi baru setelah ini.',
  })
  @ApiResponse({ status: 204, description: 'Sesi berhasil direset' })
  reset(@CurrentUser() userId: string): void {
    this.skillInitService.resetSession(userId);
  }
}

