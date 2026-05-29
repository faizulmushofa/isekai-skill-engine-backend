import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '../../infrastructure/config/config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'smtp-relay.brevo.com',
      port: Number(this.configService.get<string>('SMTP_PORT')) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Verifikasi Email Anda</h2>
        <p style="color: #334155; font-size: 16px;">Terima kasih telah mendaftar di Aether System. Silakan gunakan kode OTP berikut untuk memverifikasi alamat email Anda:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #0f172a; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">Kode OTP ini akan kedaluwarsa dalam 10 menit.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jika Anda tidak merasa mendaftar di Aether System, abaikan email ini.</p>
      </div>
    `;

    try {
      const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Aether Gateway';
      const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@aether-system.com';
      
      await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject: 'Kode OTP Verifikasi Aether',
        html,
      });
      this.logger.log(`OTP email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }
  async sendFeedbackEmail(type: 'bug' | 'feedback', username: string, userEmail: string, message: string) {
    const isBug = type === 'bug';
    const subject = isBug 
      ? `🚨 [BUG REPORT] Laporan Kendala Aether System dari ${username}` 
      : `✉️ [FEEDBACK] Pesan Pribadi Aether System dari ${username}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: ${isBug ? '#dc2626' : '#2563eb'}; text-align: center;">${isBug ? 'Laporan Kendala Baru' : 'Masukan / Pesan Baru'}</h2>
        <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${isBug ? '#dc2626' : '#2563eb'};">
          <p style="margin: 0 0 10px 0;"><strong>Dari:</strong> ${username} (${userEmail})</p>
          <p style="margin: 0;"><strong>Tipe:</strong> ${isBug ? 'Bug Report' : 'Personal Feedback'}</p>
        </div>
        <div style="background-color: #ffffff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${message}</div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Dikirim dari Widget Aether Gateway</p>
      </div>
    `;

    try {
      const adminEmail = this.configService.get<string>('SMTP_FROM_EMAIL');
      if (!adminEmail) {
        throw new Error('SMTP_FROM_EMAIL is not defined in .env');
      }

      const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'Aether Gateway';
      
      await this.transporter.sendMail({
        from: `"${fromName}" <${adminEmail}>`, // Send *from* the admin
        to: adminEmail, // Send *to* the admin
        replyTo: userEmail, // Set reply-to as the user who sent it
        subject,
        html,
      });
      this.logger.log(`Feedback email (${type}) successfully sent from ${username}`);
    } catch (error) {
      this.logger.error(`Failed to send feedback email from ${username}`, error);
      throw error;
    }
  }
}
