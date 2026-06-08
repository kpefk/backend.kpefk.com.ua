import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsString, MinLength } from 'class-validator'
import { TwoFactorMethod } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { TwoFactorAuthService } from './two-factor-auth.service'
import { TotpService } from './totp.service'

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class VerifyCodeDto {
  @IsString()
  code!: string
}

class DisableEmailDto {
  @IsString()
  @MinLength(6)
  code!: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!domain) return email
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Двофакторна автентифікація')
@Controller('auth/2fa')
export class TwoFactorController {
  public constructor(
    private readonly prisma: PrismaService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly totpService: TotpService,
  ) {}

  // ── Status ────────────────────────────────────────────────────────────────

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get('status')
  @ApiOperation({ summary: 'Статус двофакторної автентифікації' })
  public async status(@Authorized('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorMethod: true, totpVerifiedAt: true, email: true },
    })
    if (!user) throw new NotFoundException('Користувача не знайдено.')
    return {
      method: user.twoFactorMethod,
      totpVerified: !!user.totpVerifiedAt,
      email: maskEmail(user.email),
    }
  }

  // ── TOTP setup ────────────────────────────────────────────────────────────

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Post('totp/setup')
  @ApiOperation({ summary: 'Ініціювати налаштування TOTP Authenticator' })
  public async totpSetup(@Authorized('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!user) throw new NotFoundException('Користувача не знайдено.')

    const secret = this.totpService.generateSecret()
    const encryptedSecret = this.totpService.encrypt(secret)
    const otpauthUrl = this.totpService.getOtpauthUrl(user.email, secret)
    const qrCodeDataUrl = await this.totpService.generateQrCodeDataUrl(otpauthUrl)

    // Save encrypted secret temporarily (totpVerifiedAt stays null until confirmed)
    await this.prisma.user.update({
      where: { id: userId },
      data: { totpSecret: encryptedSecret, totpVerifiedAt: null },
    })

    return { secret, otpauthUrl, qrCodeDataUrl }
  }

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Post('totp/verify-setup')
  @ApiOperation({ summary: 'Підтвердити TOTP і активувати метод' })
  public async totpVerifySetup(
    @Authorized('id') userId: string,
    @Body() dto: VerifyCodeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true },
    })
    if (!user?.totpSecret) {
      throw new BadRequestException('Спочатку ініціюйте налаштування TOTP.')
    }

    const plainSecret = this.totpService.decrypt(user.totpSecret)
    if (!this.totpService.verify(dto.code, plainSecret)) {
      throw new BadRequestException('Невірний код. Перевірте застосунок та спробуйте знову.')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorMethod: TwoFactorMethod.TOTP,
        totpVerifiedAt: new Date(),
        isTwoFactorEnabled: true,
      },
    })

    return { success: true }
  }

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Post('totp/disable')
  @ApiOperation({ summary: 'Вимкнути TOTP (потрібен поточний код)' })
  public async totpDisable(
    @Authorized('id') userId: string,
    @Body() dto: VerifyCodeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { totpSecret: true, twoFactorMethod: true },
    })
    if (!user?.totpSecret || user.twoFactorMethod !== TwoFactorMethod.TOTP) {
      throw new BadRequestException('TOTP не активовано.')
    }

    const plainSecret = this.totpService.decrypt(user.totpSecret)
    if (!this.totpService.verify(dto.code, plainSecret)) {
      throw new BadRequestException('Невірний код Authenticator.')
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorMethod: TwoFactorMethod.NONE,
        totpSecret: null,
        totpVerifiedAt: null,
        isTwoFactorEnabled: false,
      },
    })

    return { success: true }
  }

  // ── Email 2FA ─────────────────────────────────────────────────────────────

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Post('email/enable')
  @ApiOperation({ summary: 'Увімкнути 2FA через email' })
  public async emailEnable(@Authorized('id') userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorMethod: TwoFactorMethod.EMAIL,
        isTwoFactorEnabled: true,
      },
    })
    return { success: true }
  }

  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Post('email/disable')
  @ApiOperation({ summary: 'Вимкнути email 2FA (потрібен поточний код з email)' })
  public async emailDisable(
    @Authorized('id') userId: string,
    @Body() dto: DisableEmailDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorMethod: true },
    })
    if (!user || user.twoFactorMethod !== TwoFactorMethod.EMAIL) {
      throw new BadRequestException('Email 2FA не активовано.')
    }

    await this.twoFactorAuthService.validateTwoFactorToken(user.email, dto.code)

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorMethod: TwoFactorMethod.NONE,
        isTwoFactorEnabled: false,
      },
    })

    return { success: true }
  }
}
