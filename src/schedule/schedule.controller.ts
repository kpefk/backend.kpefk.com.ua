import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'

import { UserRole } from '@prisma/client'

import { Authorized } from '@/auth/decorators/authorized.decorator'
import { Authorization } from '@/auth/decorators/auth.decorator'

import {
  CopyScheduleDto,
  CreateScheduleEntryDto,
  CreateSubstitutionDto,
  GenerateAllSchedulesDto,
  GenerateScheduleDto,
  MassReplaceDto,
  SetHomeroomDto,
  SwapScheduleEntriesDto,
  UpdateScheduleEntryDto,
  UpdateScheduleSettingsDto,
} from './dto/schedule.dto'
import { ScheduleAuditService } from './schedule-audit.service'
import { ScheduleExportService } from './schedule-export.service'
import { ScheduleGeneratorService } from './schedule-generator.service'
import { ScheduleService } from './schedule.service'
import { ScheduleSettingsService } from './schedule-settings.service'
import { ScheduleSubstitutionService } from './schedule-substitution.service'

/** Ролі, що складають розклад: диспетчер розкладу + керівництво. */
const DISPATCHER_ROLES = [
  UserRole.SCHEDULE_DISPATCHER,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

@ApiTags('Розклад занять')
@ApiBearerAuth('access-token')
@Controller('schedule')
// Перегляд розкладу доступний будь-якому автентифікованому користувачу
// (студенти бачать свою групу, можуть переглядати інші). Генерація та
// редагування звужені до DISPATCHER_ROLES на рівні окремих методів.
@Authorization()
export class ScheduleController {
  public constructor(
    private readonly scheduleService: ScheduleService,
    private readonly generatorService: ScheduleGeneratorService,
    private readonly settingsService: ScheduleSettingsService,
    private readonly substitutionService: ScheduleSubstitutionService,
    private readonly exportService: ScheduleExportService,
    private readonly audit: ScheduleAuditService,
  ) {}

  // ── Read ───────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Розклад групи на семестр',
    description:
      'Повертає ScheduleResponseDto. Якщо для групи немає РНП на рік — ' +
      'schedule = null, hasWorkingCurriculum = false і відповідне попередження.',
  })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @ApiQuery({ name: 'semesterNumber', required: true, example: 1 })
  @Get()
  @HttpCode(HttpStatus.OK)
  public getSchedule(
    @Query('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber', ParseIntPipe) semesterNumber: number,
  ) {
    return this.scheduleService.getSchedule(groupId, academicYear, semesterNumber)
  }

  @ApiOperation({
    summary: 'Групи для селектора розкладу (з прапором наявності РНП)',
  })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @Get('eligible-groups')
  @HttpCode(HttpStatus.OK)
  public getEligibleGroups(@Query('academicYear') academicYear: string) {
    return this.scheduleService.getEligibleGroups(academicYear)
  }

  @ApiOperation({
    summary: 'Зведений розклад усіх груп за рік (перегляд «Усі групи»)',
  })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @Get('all')
  @HttpCode(HttpStatus.OK)
  public getAll(@Query('academicYear') academicYear: string) {
    return this.scheduleService.getAllSchedules(academicYear)
  }

  @ApiOperation({ summary: 'Розклад викладача за період (ТЗ §3.10)' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @ApiQuery({ name: 'semesterNumber', required: true, example: 1 })
  @Get('by-teacher/:teacherId')
  @HttpCode(HttpStatus.OK)
  public getByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber', ParseIntPipe) semesterNumber: number,
  ) {
    return this.scheduleService.getByTeacher(teacherId, academicYear, semesterNumber)
  }

  @ApiOperation({ summary: 'Розклад аудиторії за період (ТЗ §3.10)' })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @ApiQuery({ name: 'semesterNumber', required: true, example: 1 })
  @Get('by-classroom/:classroomId')
  @HttpCode(HttpStatus.OK)
  public getByClassroom(
    @Param('classroomId') classroomId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber', ParseIntPipe) semesterNumber: number,
  ) {
    return this.scheduleService.getByClassroom(classroomId, academicYear, semesterNumber)
  }

  @ApiOperation({
    summary: 'Дисципліни РНП, доступні для ручного додавання в розклад',
  })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @ApiQuery({ name: 'semesterNumber', required: true, example: 1 })
  @Authorization(...DISPATCHER_ROLES)
  @Get('available-subjects')
  @HttpCode(HttpStatus.OK)
  public getAvailableSubjects(
    @Query('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber', ParseIntPipe) semesterNumber: number,
  ) {
    return this.scheduleService.getAvailableSubjects(
      groupId,
      academicYear,
      semesterNumber,
    )
  }

  // ── Settings (ТЗ §3.4 — Адміністратор системи) ─────────────────────────────

  @ApiOperation({ summary: 'Налаштування розкладу (ліміти пар на день)' })
  @Get('settings')
  @HttpCode(HttpStatus.OK)
  public getSettings() {
    return this.settingsService.get()
  }

  @ApiOperation({ summary: 'Оновити налаштування розкладу' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Patch('settings')
  @HttpCode(HttpStatus.OK)
  public updateSettings(@Body() dto: UpdateScheduleSettingsDto) {
    return this.settingsService.update(dto)
  }

  // ── Generate ─────────────────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Згенерувати розклад (жадібна евристика)',
    description:
      'Перегенеровує розклад групи з РНП + педагогічного навантаження, ' +
      'уникаючи конфліктів викладача/групи/аудиторії. Чужі групи не чіпаються. ' +
      'Повертає GenerateScheduleResultDto з попередженнями.',
  })
  @ApiResponse({ status: 201, description: 'GenerateScheduleResultDto' })
  @ApiResponse({ status: 404, description: 'Немає РНП для групи на рік' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('generate')
  @HttpCode(HttpStatus.CREATED)
  public async generate(
    @Body() dto: GenerateScheduleDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.generatorService.generate(dto, userId)
    await this.audit.record(userId, 'GENERATE', result.schedule.id, {
      groupId: dto.groupId,
      semesterNumber: dto.semesterNumber,
      entries: result.schedule.entries.length,
    })
    return result
  }

  @ApiOperation({
    summary: 'Згенерувати розклад одразу всім групам',
    description:
      'Масово перегенеровує розклади всіх груп, що мають РНП на обраний ' +
      'рік+семестр. Групи опрацьовуються послідовно з урахуванням зайнятості ' +
      'викладачів/аудиторій. Повертає GenerateAllResultDto з підсумком по групах.',
  })
  @ApiResponse({ status: 201, description: 'GenerateAllResultDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('generate-all')
  @HttpCode(HttpStatus.CREATED)
  public async generateAll(
    @Body() dto: GenerateAllSchedulesDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.generatorService.generateAll(dto, userId)
    await this.audit.record(userId, 'GENERATE_ALL', dto.academicYear, {
      semesterNumber: dto.semesterNumber,
      groupsProcessed: result.groupsProcessed,
      totalEntries: result.totalEntries,
    })
    return result
  }

  // ── Manual editing ───────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Додати заняття вручну' })
  @ApiResponse({ status: 201, description: 'ScheduleDto (перерахований)' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  public async createEntry(
    @Body() dto: CreateScheduleEntryDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.createEntry(dto)
    await this.audit.record(userId, 'ENTRY_CREATE', result.id, {
      subject: dto.curriculumComponentTermId,
      lessonType: dto.lessonType,
    })
    return result
  }

  @ApiOperation({ summary: 'Редагувати заняття (перенести/змінити викладача/аудиторію)' })
  @ApiResponse({ status: 200, description: 'ScheduleDto (перерахований)' })
  @Authorization(...DISPATCHER_ROLES)
  @Patch('entries/:id')
  @HttpCode(HttpStatus.OK)
  public async updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleEntryDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.updateEntry(id, dto)
    await this.audit.record(userId, 'ENTRY_UPDATE', result.id, { entryId: id })
    return result
  }

  @ApiOperation({ summary: 'Поміняти місцями два заняття (drag & drop)' })
  @ApiResponse({ status: 200, description: 'ScheduleDto (перерахований з конфліктами)' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('entries/swap')
  @HttpCode(HttpStatus.OK)
  public async swapEntries(
    @Body() dto: SwapScheduleEntriesDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.swapEntries(dto)
    await this.audit.record(userId, 'ENTRY_SWAP', result.id, {
      a: dto.entryAId,
      b: dto.entryBId,
    })
    return result
  }

  @ApiOperation({ summary: 'Масова заміна викладача/аудиторії (ТЗ §3.8)' })
  @ApiResponse({ status: 200, description: 'ScheduleDto (перерахований)' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('entries/mass-replace')
  @HttpCode(HttpStatus.OK)
  public async massReplace(
    @Body() dto: MassReplaceDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.massReplace(dto)
    await this.audit.record(userId, 'MASS_REPLACE', result.id, {
      count: dto.entryIds.length,
    })
    return result
  }

  @ApiOperation({ summary: 'Видалити заняття' })
  @ApiResponse({ status: 200, description: 'ScheduleDto (перерахований)' })
  @Authorization(...DISPATCHER_ROLES)
  @Delete('entries/:id')
  @HttpCode(HttpStatus.OK)
  public async deleteEntry(
    @Param('id') id: string,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.deleteEntry(id)
    await this.audit.record(userId, 'ENTRY_DELETE', result.id, { entryId: id })
    return result
  }

  // ── Homeroom (ТЗ §3.5) ──────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Призначити/прибрати день виховної години для групи' })
  @ApiResponse({ status: 200, description: 'ScheduleDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('homeroom')
  @HttpCode(HttpStatus.OK)
  public async setHomeroom(
    @Body() dto: SetHomeroomDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.setHomeroom(dto)
    await this.audit.record(userId, 'HOMEROOM_SET', result.id, {
      dayOfWeek: dto.dayOfWeek,
    })
    return result
  }

  // ── Copy as template (ТЗ §3.8) ──────────────────────────────────────────────

  @ApiOperation({ summary: 'Скопіювати розклад як шаблон у цільову групу/семестр' })
  @ApiResponse({ status: 201, description: 'ScheduleDto (цільовий)' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('copy')
  @HttpCode(HttpStatus.CREATED)
  public async copySchedule(
    @Body() dto: CopyScheduleDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.scheduleService.copySchedule(dto)
    await this.audit.record(userId, 'COPY', result.id, {
      from: dto.fromScheduleId,
    })
    return result
  }

  // ── Substitutions (ТЗ §3.8, §7.3) ───────────────────────────────────────────

  @ApiOperation({ summary: 'Створити/оновити заміну заняття на дату' })
  @ApiResponse({ status: 200, description: 'ScheduleDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Post('substitutions')
  @HttpCode(HttpStatus.OK)
  public async upsertSubstitution(
    @Body() dto: CreateSubstitutionDto,
    @Authorized('id') userId: string,
  ) {
    const result = await this.substitutionService.upsert(dto, userId)
    await this.audit.record(userId, 'SUBSTITUTION_SET', result.id, {
      entryId: dto.entryId,
      type: dto.type,
      date: dto.date,
    })
    return result
  }

  @ApiOperation({ summary: 'Видалити заміну заняття' })
  @ApiResponse({ status: 200, description: 'ScheduleDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Delete('substitutions/:id')
  @HttpCode(HttpStatus.OK)
  public async removeSubstitution(
    @Param('id') id: string,
    @Authorized('id') userId: string,
  ) {
    const result = await this.substitutionService.remove(id)
    await this.audit.record(userId, 'SUBSTITUTION_DELETE', result.id, { subId: id })
    return result
  }

  // ── Audit log (ТЗ §7.6) ─────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Журнал змін розкладу' })
  @Authorization(...DISPATCHER_ROLES)
  @Get(':id/audit')
  @HttpCode(HttpStatus.OK)
  public getAudit(@Param('id') id: string) {
    return this.audit.list(id)
  }

  // ── Export (ТЗ §3.11) ───────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Експорт розкладу групи в iCalendar (.ics)' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'academicYear', required: true, example: '2025-2026' })
  @ApiQuery({ name: 'semesterNumber', required: true, example: 1 })
  @Get('export/ics')
  public async exportIcs(
    @Query('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber', ParseIntPipe) semesterNumber: number,
    @Res() res: Response,
  ) {
    const { filename, content } = await this.exportService.toIcs(
      groupId,
      academicYear,
      semesterNumber,
    )
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.end(content)
  }

  // ── Publish ──────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Опублікувати розклад' })
  @ApiResponse({ status: 200, description: 'ScheduleDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  public async publish(@Param('id') id: string, @Authorized('id') userId: string) {
    const result = await this.scheduleService.setStatus(id, true)
    await this.audit.record(userId, 'PUBLISH', result.id)
    return result
  }

  @ApiOperation({ summary: 'Повернути розклад у чернетку' })
  @ApiResponse({ status: 200, description: 'ScheduleDto' })
  @Authorization(...DISPATCHER_ROLES)
  @Post(':id/unpublish')
  @HttpCode(HttpStatus.OK)
  public async unpublish(@Param('id') id: string, @Authorized('id') userId: string) {
    const result = await this.scheduleService.setStatus(id, false)
    await this.audit.record(userId, 'UNPUBLISH', result.id)
    return result
  }
}
