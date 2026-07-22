import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'

import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { ADMISSIONS_MANAGE_ROLES } from './admissions.constants'
import { AdmissionsService } from './admissions.service'
import { AdmissionSyncService } from './admission-sync.service'
import {
  AdmissionYearQueryDto,
  ExportApplicationsQueryDto,
  KonkursDistributionQueryDto,
  SyncAdmissionsDto,
  UpdateCampaignSettingsDto,
  UpdateOfferSettingsDto,
} from './dto/admissions-request.dto'

@ApiTags('Вступна кампанія')
@ApiBearerAuth('access-token')
@Controller('admissions')
@Authorization(...ADMISSIONS_MANAGE_ROLES)
export class AdmissionsController {
  public constructor(
    private readonly service: AdmissionsService,
    private readonly syncService: AdmissionSyncService,
  ) {}

  // ── Звіти (усі manage-ролі) ──────────────────────────────────────────

  @ApiOperation({ summary: 'Роки кампаній зі статусом і лічильниками' })
  @Get('years')
  @HttpCode(HttpStatus.OK)
  public years() {
    return this.service.listYears()
  }

  @ApiOperation({ summary: 'Зведення за рік (KPI + воронка + бюджет/контракт)' })
  @Get('overview')
  @HttpCode(HttpStatus.OK)
  public overview(@Query() query: AdmissionYearQueryDto) {
    return this.service.getOverview(query.year)
  }

  @ApiOperation({ summary: 'КП за рік з лічильниками заяв/зарахованих' })
  @Get('offers')
  @HttpCode(HttpStatus.OK)
  public offers(@Query() query: AdmissionYearQueryDto) {
    return this.service.listOffers(query.year)
  }

  @ApiOperation({ summary: 'Розподіл заяв за спеціальностями (розбиття по ОПП)' })
  @Get('by-speciality')
  @HttpCode(HttpStatus.OK)
  public bySpeciality(@Query() query: AdmissionYearQueryDto) {
    return this.service.bySpeciality(query.year)
  }

  @ApiOperation({ summary: 'Динаміка подання заяв по днях у розрізі ОПП' })
  @Get('by-day')
  @HttpCode(HttpStatus.OK)
  public byDay(@Query() query: AdmissionYearQueryDto) {
    return this.service.byDay(query.year)
  }

  @ApiOperation({ summary: 'Гістограма конкурсних балів' })
  @Get('konkurs-distribution')
  @HttpCode(HttpStatus.OK)
  public konkursDistribution(@Query() query: KonkursDistributionQueryDto) {
    return this.service.konkursDistribution(query.year, query.bucketSize)
  }

  @ApiOperation({ summary: 'Динаміка за роками (заяви / зараховані)' })
  @Get('trends')
  @HttpCode(HttpStatus.OK)
  public trends() {
    return this.service.yearTrends()
  }

  // ── Операції з ПД / синхронізація (лише ADMINISTRATOR) ────────────────

  @ApiOperation({ summary: 'Операційний список заяв із ПД (лише активна кампанія)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Get('applications')
  @HttpCode(HttpStatus.OK)
  public applications(
    @Query() query: AdmissionYearQueryDto,
    @Authorized('id') userId: string,
    @Req() req: Request,
  ) {
    return this.service.listApplications(query.year, userId, req.ip ?? null)
  }

  @ApiOperation({ summary: 'Експорт заяв вступників у .xlsx (з урахуванням фільтрів)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Get('applications/export')
  public async exportApplications(
    @Query() query: ExportApplicationsQueryDto,
    @Authorized('id') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { year, ...filters } = query
    const { buffer, filename } = await this.service.exportApplicationsXlsx(
      year,
      filters,
      userId,
      req.ip ?? null,
    )
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_')
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(buffer.length),
    })
    res.end(buffer)
  }

  @ApiOperation({ summary: 'Синхронізувати рік з ЄДЕБО (КП + заяви)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post('sync')
  @HttpCode(HttpStatus.OK)
  public sync(@Body() dto: SyncAdmissionsDto) {
    return this.syncService.syncYear(dto.year)
  }

  @ApiOperation({ summary: 'Архівувати рік — вичистити ПД, лишити звітні поля' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post(':year/archive')
  @HttpCode(HttpStatus.OK)
  public archive(@Param('year', ParseIntPipe) year: number) {
    return this.syncService.archiveYear(year)
  }

  // ── Налаштування авто-реєстрації (лише ADMINISTRATOR) ─────────────────

  @ApiOperation({ summary: 'Налаштування кампанії + КП (суфікси справ, реєстрація)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Get('settings')
  @HttpCode(HttpStatus.OK)
  public settings(@Query() query: AdmissionYearQueryDto) {
    return this.service.getSettings(query.year)
  }

  @ApiOperation({ summary: 'Оновити налаштування кампанії (авто-реєстрація + ресинк)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  public updateSettings(
    @Query() query: AdmissionYearQueryDto,
    @Body() dto: UpdateCampaignSettingsDto,
  ) {
    return this.service.updateCampaignSettings(query.year, dto)
  }

  @ApiOperation({ summary: 'Оновити налаштування КП (суфікс справи + текст реєстрації)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Patch('offers/:universitySpecialitiesId/settings')
  @HttpCode(HttpStatus.OK)
  public updateOfferSettings(
    @Param('universitySpecialitiesId', ParseIntPipe) universitySpecialitiesId: number,
    @Query() query: AdmissionYearQueryDto,
    @Body() dto: UpdateOfferSettingsDto,
  ) {
    return this.service.updateOfferSettings(query.year, universitySpecialitiesId, dto)
  }

  @ApiOperation({ summary: 'Ручний запуск авто-реєстрації (1 → 5 + номер справи)' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post('auto-register')
  @HttpCode(HttpStatus.OK)
  public autoRegister(
    @Body() dto: SyncAdmissionsDto,
    @Authorized('id') userId: string,
  ) {
    return this.syncService.autoRegisterPending(dto.year, userId)
  }

  @ApiOperation({ summary: 'Підтягнути документи про освіту заочних вступників з ЄДЕБО' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post('fetch-education-docs')
  @HttpCode(HttpStatus.OK)
  public fetchEducationDocs(@Body() dto: SyncAdmissionsDto) {
    return this.syncService.fetchEntryEducationDocs(dto.year)
  }
}
