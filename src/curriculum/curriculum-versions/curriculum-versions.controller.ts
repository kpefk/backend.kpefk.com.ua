import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CreateCalendarEntryDto } from './dto/create-calendar-entry.dto'
import { CreateComponentDto } from './dto/create-component.dto'
import { CreateComponentProjectionDto } from './dto/create-component-projection.dto'
import { CreateComponentTermDto } from './dto/create-component-term.dto'
import { CreateCurriculumVersionDto } from './dto/create-curriculum-version.dto'
import { CreateElectiveBlockDto } from './dto/create-elective-block.dto'
import { CreateSectionDto } from './dto/create-section.dto'
import { CreateTimeBudgetEntryDto } from './dto/create-time-budget-entry.dto'
import { UpdateComponentDto } from './dto/update-component.dto'
import { UpdateComponentTermDto } from './dto/update-component-term.dto'
import { UpdateSectionDto } from './dto/update-section.dto'
import { CurriculumVersionsService } from './curriculum-versions.service'

const WRITE_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.ADMINISTRATOR,
]

@ApiTags('Навчальний план — Версії плану та структура')
@ApiBearerAuth('access-token')
@Controller()
@Authorization()
export class CurriculumVersionsController {
  public constructor(private readonly versionsService: CurriculumVersionsService) {}

  // ── Version ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Отримати версію навчального плану з повною структурою' })
  @ApiParam({ name: 'id', description: 'UUID версії' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Get('curriculum-versions/:id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.versionsService.findById(id)
  }

  @ApiOperation({ summary: 'Створити нову версію навчального плану' })
  @ApiParam({ name: 'curriculumId', description: 'UUID навчального плану' })
  @ApiResponse({ status: 201 })
  @Post('curricula/:curriculumId/versions')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public create(
    @Param('curriculumId') curriculumId: string,
    @Body() dto: CreateCurriculumVersionDto,
  ) {
    return this.versionsService.create(curriculumId, dto)
  }

  @ApiOperation({ summary: 'Опублікувати версію навчального плану' })
  @ApiParam({ name: 'id', description: 'UUID версії' })
  @Post('curriculum-versions/:id/publish')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public publish(@Param('id') id: string) {
    return this.versionsService.publish(id)
  }

  @ApiOperation({ summary: 'Депрекувати версію навчального плану' })
  @ApiParam({ name: 'id', description: 'UUID версії' })
  @Post('curriculum-versions/:id/deprecate')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public deprecate(@Param('id') id: string) {
    return this.versionsService.deprecate(id)
  }

  @ApiOperation({ summary: 'Видалити чернеткову версію навчального плану' })
  @ApiParam({ name: 'id', description: 'UUID версії' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Версія опублікована, застаріла або вже використовується' })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Delete('curriculum-versions/:id')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public async deleteVersion(@Param('id') id: string) {
    await this.versionsService.deleteVersion(id)
    return { deleted: true }
  }

  @ApiOperation({ summary: 'Дублювати структуру версії у новий чернетковий план' })
  @ApiParam({ name: 'sourceVersionId', description: 'UUID вихідної версії' })
  @ApiParam({ name: 'curriculumId', description: 'UUID навчального плану для нової версії' })
  @Post('curriculum-versions/:sourceVersionId/duplicate-into/:curriculumId')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public duplicateFrom(
    @Param('sourceVersionId') sourceVersionId: string,
    @Param('curriculumId') curriculumId: string,
  ) {
    return this.versionsService.duplicateFrom(sourceVersionId, curriculumId)
  }

  // ── Sections ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати розділ до версії плану' })
  @ApiParam({ name: 'versionId', description: 'UUID версії' })
  @Post('curriculum-versions/:versionId/sections')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createSection(
    @Param('versionId') versionId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.versionsService.createSection(versionId, dto)
  }

  @ApiOperation({ summary: 'Оновити розділ' })
  @ApiParam({ name: 'sectionId', description: 'UUID розділу' })
  @Patch('curriculum-sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public updateSection(
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.versionsService.updateSection(sectionId, dto)
  }

  @ApiOperation({ summary: 'Видалити розділ (тільки порожній)' })
  @ApiParam({ name: 'sectionId', description: 'UUID розділу' })
  @Delete('curriculum-sections/:sectionId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public deleteSection(@Param('sectionId') sectionId: string) {
    return this.versionsService.deleteSection(sectionId)
  }

  // ── Elective Blocks ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати блок вибіркових компонентів до розділу' })
  @ApiParam({ name: 'sectionId', description: 'UUID розділу' })
  @Post('curriculum-sections/:sectionId/elective-blocks')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createElectiveBlock(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateElectiveBlockDto,
  ) {
    return this.versionsService.createElectiveBlock(sectionId, dto)
  }

  // ── Components ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати освітній компонент до розділу' })
  @ApiParam({ name: 'sectionId', description: 'UUID розділу' })
  @Post('curriculum-sections/:sectionId/components')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createComponent(
    @Param('sectionId') sectionId: string,
    @Body() dto: CreateComponentDto,
  ) {
    return this.versionsService.createComponent(sectionId, dto)
  }

  @ApiOperation({ summary: 'Оновити освітній компонент' })
  @ApiParam({ name: 'componentId', description: 'UUID компонента' })
  @Patch('curriculum-components/:componentId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public updateComponent(
    @Param('componentId') componentId: string,
    @Body() dto: UpdateComponentDto,
  ) {
    return this.versionsService.updateComponent(componentId, dto)
  }

  @ApiOperation({ summary: 'Видалити освітній компонент' })
  @ApiParam({ name: 'componentId', description: 'UUID компонента' })
  @Delete('curriculum-components/:componentId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public deleteComponent(@Param('componentId') componentId: string) {
    return this.versionsService.deleteComponent(componentId)
  }

  // ── Component Display Projections ─────────────────────────────────────────

  @ApiOperation({ summary: 'Додати відображення компонента в додатковий розділ (інтеграційна проекція)' })
  @ApiParam({ name: 'versionId', description: 'UUID версії навчального плану' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Той самий розділ, крос-версійна проекція, версія опублікована або дублікат' })
  @Post('curriculum-versions/:versionId/component-projections')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createProjection(
    @Param('versionId') versionId: string,
    @Body() dto: CreateComponentProjectionDto,
  ) {
    return this.versionsService.createProjection(versionId, dto)
  }

  @ApiOperation({ summary: 'Видалити інтеграційну проекцію компонента' })
  @ApiParam({ name: 'projectionId', description: 'UUID проекції' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Версія опублікована' })
  @ApiResponse({ status: 404, description: 'Проекцію не знайдено' })
  @Delete('curriculum-component-projections/:projectionId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public async deleteProjection(@Param('projectionId') projectionId: string) {
    await this.versionsService.deleteProjection(projectionId)
    return { deleted: true }
  }

  // ── Component Terms ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати розподіл компонента по семестру' })
  @ApiParam({ name: 'componentId', description: 'UUID компонента' })
  @Post('curriculum-components/:componentId/terms')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createComponentTerm(
    @Param('componentId') componentId: string,
    @Body() dto: CreateComponentTermDto,
  ) {
    return this.versionsService.createComponentTerm(componentId, dto)
  }

  @ApiOperation({ summary: 'Оновити розподіл компонента' })
  @ApiParam({ name: 'termId', description: 'UUID розподілу' })
  @Patch('curriculum-component-terms/:termId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public updateComponentTerm(
    @Param('termId') termId: string,
    @Body() dto: UpdateComponentTermDto,
  ) {
    return this.versionsService.updateComponentTerm(termId, dto)
  }

  @ApiOperation({ summary: 'Видалити розподіл компонента' })
  @ApiParam({ name: 'termId', description: 'UUID розподілу' })
  @Delete('curriculum-component-terms/:termId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public deleteComponentTerm(@Param('termId') termId: string) {
    return this.versionsService.deleteComponentTerm(termId)
  }

  // ── Time Budget ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати рядок бюджету часу' })
  @ApiParam({ name: 'versionId', description: 'UUID версії' })
  @Post('curriculum-versions/:versionId/time-budget')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createTimeBudgetEntry(
    @Param('versionId') versionId: string,
    @Body() dto: CreateTimeBudgetEntryDto,
  ) {
    return this.versionsService.createTimeBudgetEntry(versionId, dto)
  }

  @ApiOperation({ summary: 'Видалити рядок бюджету часу' })
  @ApiParam({ name: 'entryId', description: 'UUID запису' })
  @Delete('time-budget-entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public deleteTimeBudgetEntry(@Param('entryId') entryId: string) {
    return this.versionsService.deleteTimeBudgetEntry(entryId)
  }

  // ── Academic Calendar ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати/оновити тиждень в графіку навчального процесу (upsert)' })
  @ApiParam({ name: 'versionId', description: 'UUID версії' })
  @Post('curriculum-versions/:versionId/calendar')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public upsertCalendarEntry(
    @Param('versionId') versionId: string,
    @Body() dto: CreateCalendarEntryDto,
  ) {
    return this.versionsService.upsertCalendarEntry(versionId, dto)
  }

  @ApiOperation({ summary: 'Видалити запис з графіку' })
  @ApiParam({ name: 'entryId', description: 'UUID запису' })
  @Delete('academic-calendar-entries/:entryId')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public deleteCalendarEntry(@Param('entryId') entryId: string) {
    return this.versionsService.deleteCalendarEntry(entryId)
  }
}
