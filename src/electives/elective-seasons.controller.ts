import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import type { User } from '@prisma/client'

import { ConfirmGroupSelectionDto } from './dto/confirm-group-selection.dto'
import { CreateCampaignDto } from './dto/create-campaign.dto'
import { UpdateCampaignDto } from './dto/update-campaign.dto'
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto'
import { ElectiveSeasonsService } from './elective-seasons.service'

@ApiTags('Вибіркові компоненти — кампанії')
@ApiBearerAuth('access-token')
@Controller('electives')
@Authorization()
export class ElectiveSeasonsController {
  public constructor(private readonly service: ElectiveSeasonsService) {}

  // ── Campaigns (annual selection process, §2.4 / §3.x) ──────────────

  @ApiOperation({ summary: '(Адмін) Кампанії вибору ВК (по роках)' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/campaigns')
  @HttpCode(HttpStatus.OK)
  public getCampaigns() {
    return this.service.getCampaigns()
  }

  @ApiOperation({ summary: '(Адмін) Деталі кампанії з block-сезонами' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/campaigns/:id')
  @HttpCode(HttpStatus.OK)
  public getCampaign(@Param('id') id: string) {
    return this.service.getCampaign(id)
  }

  @ApiOperation({ summary: '(Адмін) Створити кампанію на навчальний рік' })
  @Authorization('DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/campaigns')
  @HttpCode(HttpStatus.CREATED)
  public createCampaign(@Body() dto: CreateCampaignDto) {
    return this.service.createCampaign(dto)
  }

  @ApiOperation({ summary: '(Адмін) Оновити метадані кампанії (педрада, наказ, дедлайни)' })
  @ApiParam({ name: 'id' })
  @Authorization('DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/campaigns/:id')
  @HttpCode(HttpStatus.OK)
  public updateCampaign(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.service.updateCampaign(id, dto)
  }

  @ApiOperation({ summary: '(Адмін) Bulk-перехід статусу кампанії та всіх її сезонів' })
  @ApiParam({ name: 'id' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/campaigns/:id/status')
  @HttpCode(HttpStatus.OK)
  public updateCampaignStatus(@Param('id') id: string, @Body() dto: UpdateCampaignStatusDto) {
    return this.service.updateCampaignStatus(id, dto)
  }

  @ApiOperation({ summary: '(Адмін) Згенерувати block-сезони кампанії за прив\'язками груп' })
  @ApiParam({ name: 'id' })
  @Authorization('DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/campaigns/:id/generate')
  @HttpCode(HttpStatus.OK)
  public generateBlockSeasons(@Param('id') id: string) {
    return this.service.generateBlockSeasons(id)
  }

  @ApiOperation({ summary: '(Адмін) Зведення прогресу вибору по групах кампанії' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/campaigns/:id/progress')
  @HttpCode(HttpStatus.OK)
  public getCampaignProgress(@Param('id') id: string) {
    return this.service.getCampaignProgress(id)
  }

  // ── Group outcome (§3.6 / §3.9 / §3.10) ────────────────────────────

  @ApiOperation({
    summary: '(Адмін) Зафіксувати підсумок вибору групи: кворум/наказ + пропагація в РНП',
  })
  @ApiParam({ name: 'seasonId' })
  @ApiParam({ name: 'groupId' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/seasons/:seasonId/groups/:groupId/confirm')
  @HttpCode(HttpStatus.OK)
  public confirmGroupSelection(
    @Req() req: Request & { user: User },
    @Param('seasonId') seasonId: string,
    @Param('groupId') groupId: string,
    @Body() dto: ConfirmGroupSelectionDto,
  ) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.confirmGroupSelection(seasonId, groupId, dto, adminId)
  }

  // ── Student: catalog resolved via group assignment ─────────────────

  @ApiOperation({ summary: 'Мої блоки ВК (через прив\'язку групи до навчального плану)' })
  @ApiQuery({ name: 'academicYear', required: true })
  @Get('my-blocks')
  @HttpCode(HttpStatus.OK)
  public getMyBlocks(
    @Req() req: Request & { user: User },
    @Query('academicYear') academicYear: string,
  ) {
    const studentId =
      (req.user as unknown as { studentId?: string }).studentId ??
      (req.user as unknown as { id: string }).id
    return this.service.getMyBlocks(studentId, academicYear)
  }
}
