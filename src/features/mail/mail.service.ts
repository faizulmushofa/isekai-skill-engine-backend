import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../infrastructure/config/config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {}

  private async sendEmailViaBrevo(params: {
    to: string;
    subject: string;
    htmlContent: string;
    replyTo?: string;
  }) {
    const apiKey = this.configService.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      throw new Error('BREVO_API_KEY is not defined in .env');
    }

    const fromName = this.configService.get<string>('MAIL_SENDER_NAME') || 'Aether Gateway';
    const fromEmail = this.configService.get<string>('MAIL_SENDER_EMAIL') || 'noreply@aether-system.com';

    const payload: any = {
      sender: {
        name: fromName,
        email: fromEmail,
      },
      to: [
        {
          email: params.to,
        },
      ],
      subject: params.subject,
      htmlContent: params.htmlContent,
    };

    if (params.replyTo) {
      payload.replyTo = {
        email: params.replyTo,
      };
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Brevo API responded with status ${response.status}: ${errorText}`);
    }
  }

  async sendOtpEmail(to: string, otp: string) {
    const htmlContent = `
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
      await this.sendEmailViaBrevo({
        to,
        subject: 'Kode OTP Verifikasi Aether',
        htmlContent,
      });
      this.logger.log(`OTP email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      throw error;
    }
  }

  async sendResetPasswordOtpEmail(to: string, otp: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
        <h2 style="color: #2563eb; text-align: center;">Reset Password Anda</h2>
        <p style="color: #334155; font-size: 16px;">Anda telah meminta untuk mereset password akun Aether System Anda. Silakan gunakan kode OTP berikut:</p>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #0f172a; letter-spacing: 5px; margin: 0; font-size: 32px;">${otp}</h1>
        </div>
        <p style="color: #64748b; font-size: 14px; text-align: center;">Kode OTP ini akan kedaluwarsa dalam 10 menit.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="color: #94a3b8; font-size: 12px; text-align: center;">Jika Anda tidak meminta reset password, abaikan email ini dan pastikan akun Anda aman.</p>
      </div>
    `;

    try {
      await this.sendEmailViaBrevo({
        to,
        subject: 'Kode OTP Reset Password Aether',
        htmlContent,
      });
      this.logger.log(`Reset Password OTP email successfully sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send Reset Password OTP email to ${to}`, error);
      throw error;
    }
  }

  async sendFeedbackEmail(type: 'bug' | 'feedback', username: string, userEmail: string, message: string) {
    const isBug = type === 'bug';
    const subject = isBug 
      ? `🚨 [BUG REPORT] Laporan Kendala Aether System dari ${username}` 
      : `✉️ [FEEDBACK] Pesan Pribadi Aether System dari ${username}`;

    const htmlContent = `
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
      const adminEmail = this.configService.get<string>('MAIL_SENDER_EMAIL');
      if (!adminEmail) {
        throw new Error('MAIL_SENDER_EMAIL is not defined in .env');
      }

      await this.sendEmailViaBrevo({
        to: adminEmail,
        subject,
        htmlContent,
        replyTo: userEmail,
      });
      this.logger.log(`Feedback email (${type}) successfully sent from ${username}`);
    } catch (error) {
      this.logger.error(`Failed to send feedback email from ${username}`, error);
      throw error;
    }
  }
}
