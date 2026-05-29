import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { MailService } from './mail.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Request } from 'express';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post('feedback')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async submitFeedback(
    @Req() req: Request,
    @Body() payload: { type: 'bug' | 'feedback'; message: string; username: string; email: string }
  ) {
    if (!payload.type || !['bug', 'feedback'].includes(payload.type)) {
      throw new BadRequestException('Tipe laporan tidak valid');
    }
    if (!payload.message || payload.message.trim() === '') {
      throw new BadRequestException('Pesan laporan tidak boleh kosong');
    }
    
    // We get username and email from the frontend payload which is populated from useAuthStore
    // Alternatively, we could extract them from the JWT if it contained them, 
    // but right now JWT only has userId, so we just trust the payload for now.
    
    await this.mailService.sendFeedbackEmail(
      payload.type,
      payload.username || 'User',
      payload.email || 'unknown@aether-system.com',
      payload.message
    );
    
    return { message: 'Laporan berhasil dikirim' };
  }
}
