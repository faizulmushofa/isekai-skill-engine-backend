import { Controller, Get, Post, Delete, Body, Param, UseGuards, Query, Req, Res, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBody } from '@nestjs/swagger';
import { TokenTrackerService } from '../token-management/token-tracker.service';
import { DynamicRoutingService } from '../ai/routing/dynamic-routing.service';
import { InfraKeyGuard } from './infra-key.guard';
import { AiTaskType } from '../ai/enums/ai-task-type.enum';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '../jwt/jwt.service';
import type { Response, Request } from 'express';
import * as crypto from 'crypto';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';

@ApiTags('Infra')
@Controller('infra')
export class InfraDashboardController {
  private getWebAuthnConfig() {
    const originStr = process.env.ADMIN_FRONTEND_URL;
    if (!originStr) {
      throw new Error('ADMIN_FRONTEND_URL environment variable is not defined.');
    }
    let rpID = 'localhost';
    try {
      const url = new URL(originStr);
      rpID = url.hostname;
    } catch {}
    return { rpID, origin: originStr, rpName: 'Isekai Skill Engine' };
  }

  private currentChallenge: string | null = null;

  constructor(
    private readonly tokenTracker: TokenTrackerService,
    private readonly dynamicRouting: DynamicRoutingService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  @Get('blocks')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get blocked AI users' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getBlockedUsers() {
    return this.prisma.aiUserBlock.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('users')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get all users for dashboard' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        isEmailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Delete('users/:id')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async deleteUser(@Param('id') id: string) {
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  @Post('blocks')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Block a user from an AI task' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async blockUser(@Body() body: { userName: string; taskType: string; reason?: string }) {
    return this.prisma.aiUserBlock.upsert({
      where: {
        userName_taskType: {
          userName: body.userName,
          taskType: body.taskType,
        },
      },
      update: { reason: body.reason },
      create: {
        userName: body.userName,
        taskType: body.taskType,
        reason: body.reason,
      },
    });
  }

  @Delete('blocks/:id')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Unblock a user' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async unblockUser(@Param('id') id: string) {
    await this.prisma.aiUserBlock.delete({ where: { id } });
    return { success: true };
  }

  @Get('token-stats')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get current in-memory token usage and DB history' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getTokenStats() {
    const memory = this.tokenTracker.getInMemoryStats();
    const history = await this.tokenTracker.getDbStats();
    return { memory, history };
  }

  @Get('model-usage')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get token usage aggregated by model for today and this month' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getModelUsage() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // 1. Get usage today grouped by model
    const usageToday = await this.prisma.dailyTokenUsage.groupBy({
      by: ['provider', 'model'],
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      where: {
        date: today,
      },
    });

    // 2. Get usage this month grouped by model
    const usageMonth = await this.prisma.dailyTokenUsage.groupBy({
      by: ['provider', 'model'],
      _sum: {
        totalTokens: true,
        promptTokens: true,
        completionTokens: true,
      },
      where: {
        date: {
          gte: firstDayOfMonth,
        },
      },
    });

    return {
      today: usageToday.map(item => ({
        provider: item.provider,
        model: item.model,
        totalTokens: item._sum.totalTokens ?? 0,
        promptTokens: item._sum.promptTokens ?? 0,
        completionTokens: item._sum.completionTokens ?? 0,
      })),
      month: usageMonth.map(item => ({
        provider: item.provider,
        model: item.model,
        totalTokens: item._sum.totalTokens ?? 0,
        promptTokens: item._sum.promptTokens ?? 0,
        completionTokens: item._sum.completionTokens ?? 0,
      })),
    };
  }

  @Get('routing-config')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get current AI task routing configs' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  getRoutingConfig() {
    return this.dynamicRouting.getAllRoutes();
  }

  @Post('routing-config')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Update AI task routing config' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async updateRoutingConfig(@Body() body: { taskType: AiTaskType; provider: 'gemini' | 'groq'; model: string; temperature: number; fallbackProvider?: 'gemini' | 'groq'; fallbackModel?: string; maxDailyTokens?: number }) {
    await this.dynamicRouting.updateRouteOverride(body.taskType, body.provider, body.model, body.temperature, body.fallbackProvider, body.fallbackModel, body.maxDailyTokens);
    return { success: true };
  }

  // --- QUOTA ENDPOINTS ---
  @Get('quotas/configs')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get System Quota Configs' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getQuotaConfigs() {
    return this.prisma.systemQuotaConfig.findMany();
  }

  @Post('quotas/configs')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Update System Quota Config' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async updateQuotaConfig(@Body() body: { actionType: string; maxLimit: number; resetPeriodH: number }) {
    return this.prisma.systemQuotaConfig.upsert({
      where: { actionType: body.actionType },
      update: { maxLimit: body.maxLimit, resetPeriodH: body.resetPeriodH },
      create: { actionType: body.actionType, maxLimit: body.maxLimit, resetPeriodH: body.resetPeriodH },
    });
  }

  @Get('quotas/users')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Get all user quotas usage' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async getUserQuotas() {
    return this.prisma.userActionQuota.findMany({
      include: { user: { select: { username: true, email: true } } },
      orderBy: { windowStart: 'desc' },
    });
  }

  @Delete('quotas/users/:id')
  @UseGuards(InfraKeyGuard)
  @ApiOperation({ summary: 'Reset a user quota' })
  @ApiQuery({ name: 'key', required: true, description: 'Infra Secret Key' })
  async resetUserQuota(@Param('id') id: string) {
    await this.prisma.userActionQuota.delete({ where: { id } });
    return { success: true };
  }

  // --- WEBAUTHN ENDPOINTS ---
  @Get('auth/generate-registration-options')
  async generateRegistrationOptions(@Query('key') key: string) {
    const expectedKey = process.env.INFRA_SECRET_KEY;
    if (!expectedKey) throw new UnauthorizedException('Infra secret not configured');
    
    try {
      const keyBuffer = Buffer.from(key, 'utf-8');
      const expectedBuffer = Buffer.from(expectedKey, 'utf-8');
      if (keyBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
        throw new UnauthorizedException('Invalid infra secret key');
      }
    } catch {
      throw new UnauthorizedException('Invalid infra secret key');
    }

    const passkeyCount = await this.prisma.infraPasskey.count();
    if (passkeyCount > 0) {
      throw new ForbiddenException('A passkey is already registered. Registration is permanently locked.');
    }

    const { rpName, rpID } = this.getWebAuthnConfig();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new Uint8Array(Buffer.from('infra_admin')),
      userName: 'infra_admin',
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
    });

    this.currentChallenge = options.challenge;
    return options;
  }

  @Post('auth/verify-registration')
  async verifyRegistration(@Query('key') key: string, @Body() body: any) {
    const expectedKey = process.env.INFRA_SECRET_KEY;
    if (!expectedKey) throw new UnauthorizedException('Infra secret not configured');
    
    try {
      const keyBuffer = Buffer.from(key, 'utf-8');
      const expectedBuffer = Buffer.from(expectedKey, 'utf-8');
      if (keyBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
        throw new UnauthorizedException('Invalid infra secret key');
      }
    } catch {
      throw new UnauthorizedException('Invalid infra secret key');
    }

    const passkeyCount = await this.prisma.infraPasskey.count();
    if (passkeyCount > 0) {
      throw new ForbiddenException('A passkey is already registered. Registration is permanently locked.');
    }

    if (!this.currentChallenge) {
      throw new UnauthorizedException('No challenge found');
    }

    const { rpID, origin } = this.getWebAuthnConfig();

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: this.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential } = verification.registrationInfo;
      
      await this.prisma.infraPasskey.create({
        data: {
          credentialID: credential.id,
          publicKey: Buffer.from(credential.publicKey),
          counter: BigInt(credential.counter),
          transports: JSON.stringify(body.response.transports || []),
        }
      });

      this.currentChallenge = null;
      return { verified: true };
    }
    
    throw new UnauthorizedException('Registration failed');
  }

  @Get('auth/generate-authentication-options')
  async generateAuthenticationOptions() {
    const passkey = await this.prisma.infraPasskey.findFirst();
    if (!passkey) {
      throw new UnauthorizedException('No passkey registered yet');
    }

    const { rpID } = this.getWebAuthnConfig();

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: passkey.credentialID,
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      }],
      userVerification: 'preferred',
    });

    this.currentChallenge = options.challenge;
    return options;
  }

  @Post('auth/verify-authentication')
  async verifyAuthentication(@Body() body: any, @Res({ passthrough: true }) res: Response) {
    if (!this.currentChallenge) {
      throw new UnauthorizedException('No challenge found');
    }

    // Try finding by credential ID if provided
    let passkey;
    if (body.id) {
       passkey = await this.prisma.infraPasskey.findUnique({
         where: { credentialID: body.id }
       });
    } else {
       // Fallback to finding the first (and only) passkey
       passkey = await this.prisma.infraPasskey.findFirst();
    }

    if (!passkey) {
      throw new UnauthorizedException('Passkey not found');
    }

    const { rpID, origin } = this.getWebAuthnConfig();

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: this.currentChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: Number(passkey.counter),
        transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
      }
    });

    if (verification.verified && verification.authenticationInfo) {
      // Update counter
      await this.prisma.infraPasskey.update({
        where: { id: passkey.id },
        data: { counter: BigInt(verification.authenticationInfo.newCounter) }
      });

      this.currentChallenge = null;

      // Generate session token (1 hour)
      const token = this.jwtService.signAccessToken({ userId: 'infra_admin' });
      
      // Set HttpOnly cookie
      res.cookie('infra_session', token, {
        httpOnly: true,
        secure: true, // Always secure for sameSite: 'none'
        maxAge: 3600000, // 1 hour
        sameSite: 'none', // Allow cross-origin requests from Vercel to Railway
      });

      return { verified: true };
    }

    throw new UnauthorizedException('Authentication failed');
  }

}
