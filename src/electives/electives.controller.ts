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
  Query,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import type { User } from '@prisma/client'

import { AdminAssignDto } from './dto/admin-assign.dto'
import { AdminAssignV2Dto } from './dto/admin-assign-v2.dto'
import { AutoAssignBulkDto } from './dto/auto-assign-bulk.dto'
import { CloneElectiveCatalogDto } from './dto/clone-elective-catalog.dto'
import { CreateElectiveComponentDto } from './dto/create-elective-component.dto'
import { CreateOfferingDto } from './dto/create-offering.dto'
import { CreateSeasonDto } from './dto/create-season.dto'
import { SelectElectiveDto } from './dto/select-elective.dto'
import { StudentSelectDto } from './dto/student-select.dto'
import { UpdateCatalogStatusDto } from './dto/update-catalog-status.dto'
import { UpdateElectiveComponentDto } from './dto/update-elective-component.dto'
import { UpdateOfferingDto } from './dto/update-offering.dto'
import { UpdateSeasonStatusDto } from './dto/update-season-status.dto'
import { ElectivesService } from './electives.service'

@ApiTags('Вибіркові компоненти')
@ApiBearerAuth('access-token')
@Controller('electives')
@Authorization()
export class ElectivesController {
  public constructor(private readonly service: ElectivesService) {}

  // ── Season management (admin, new architecture) ───────────────────

  @ApiOperation({ summary: '(Адмін) Сезони ВК' })
  @ApiQuery({ name: 'academicYear', required: false })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/seasons')
  @HttpCode(HttpStatus.OK)
  public getSeasons(@Query('academicYear') academicYear?: string) {
    return this.service.getSeasons(academicYear)
  }

  @ApiOperation({ summary: '(Адмін) Створити сезон для блоку' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/seasons')
  @HttpCode(HttpStatus.CREATED)
  public createSeason(@Body() dto: CreateSeasonDto) {
    return this.service.createSeason(dto)
  }

  @ApiOperation({ summary: '(Адмін) Змінити статус сезону' })
  @ApiParam({ name: 'id' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/seasons/:id/status')
  @HttpCode(HttpStatus.OK)
  public updateSeasonStatus(@Param('id') id: string, @Body() dto: UpdateSeasonStatusDto) {
    return this.service.updateSeasonStatus(id, dto)
  }

  @ApiOperation({ summary: '(Адмін) Видалити сезон (тільки DRAFT)' })
  @ApiParam({ name: 'id' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Delete('admin/seasons/:id')
  @HttpCode(HttpStatus.OK)
  public deleteSeason(@Param('id') id: string) {
    return this.service.deleteSeason(id)
  }

  // ── Offering management (admin, new architecture) ─────────────────

  @ApiOperation({ summary: '(Адмін) Варіанти ВК у сезоні' })
  @ApiParam({ name: 'seasonId' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/seasons/:seasonId/offerings')
  @HttpCode(HttpStatus.OK)
  public getOfferings(@Param('seasonId') seasonId: string) {
    return this.service.getOfferingsForSeason(seasonId)
  }

  @ApiOperation({ summary: '(Адмін) Додати варіант до сезону' })
  @ApiParam({ name: 'seasonId' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/seasons/:seasonId/offerings')
  @HttpCode(HttpStatus.CREATED)
  public addOffering(@Param('seasonId') seasonId: string, @Body() dto: CreateOfferingDto) {
    return this.service.addOffering(seasonId, dto)
  }

  @ApiOperation({ summary: '(Адмін) Оновити варіант' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/offerings/:id')
  @HttpCode(HttpStatus.OK)
  public updateOffering(@Param('id') id: string, @Body() dto: UpdateOfferingDto) {
    return this.service.updateOffering(id, dto)
  }

  @ApiOperation({ summary: '(Адмін) Видалити варіант (тільки DRAFT сезон)' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Delete('admin/offerings/:id')
  @HttpCode(HttpStatus.OK)
  public removeOffering(@Param('id') id: string) {
    return this.service.removeOffering(id)
  }

  // ── ElectiveBlocks listing (admin) ───────────────────────────────

  @ApiOperation({ summary: '(Адмін) Список слотів ВК (ElectiveBlock)' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/blocks')
  @HttpCode(HttpStatus.OK)
  public getElectiveBlocks() {
    return this.service.getElectiveBlocks()
  }

  // ── Components for block (admin helper) ───────────────────────────

  @ApiOperation({ summary: '(Адмін) CurriculumComponents для блоку ВК' })
  @ApiParam({ name: 'blockId' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/blocks/:blockId/components')
  @HttpCode(HttpStatus.OK)
  public getComponentsForBlock(@Param('blockId') blockId: string) {
    return this.service.getComponentsForBlock(blockId)
  }

  // ── Student view (new architecture) ──────────────────────────────

  @ApiOperation({ summary: 'Блоки ВК для студента (нова архітектура)' })
  @ApiQuery({ name: 'oppCode', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  @Get('blocks')
  @HttpCode(HttpStatus.OK)
  public getBlocksForStudent(
    @Query('oppCode') oppCode: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getBlocksForStudent(oppCode, academicYear)
  }

  // ── Student selection (new architecture) ──────────────────────────

  @ApiOperation({ summary: 'Обрати ВК (студент, нова архітектура)' })
  @Post('selections')
  @HttpCode(HttpStatus.CREATED)
  public studentSelect(@Req() req: Request & { user: User }, @Body() dto: StudentSelectDto) {
    const studentId = this.resolveStudentId(req)
    return this.service.studentSelect(studentId, dto)
  }

  @ApiOperation({ summary: 'Скасувати вибір ВК (студент, нова архітектура)' })
  @ApiParam({ name: 'id', description: 'ID StudentElectiveSelection' })
  @Delete('selections/:id')
  @HttpCode(HttpStatus.OK)
  public studentCancelSelection(@Req() req: Request & { user: User }, @Param('id') id: string) {
    const studentId = this.resolveStudentId(req)
    return this.service.studentCancelSelection(id, studentId)
  }

  @ApiOperation({ summary: 'Мій вибір ВК (нова архітектура)' })
  @ApiQuery({ name: 'academicYear', required: false })
  @Get('my-selections')
  @HttpCode(HttpStatus.OK)
  public getMySelectionsV2(
    @Req() req: Request & { user: User },
    @Query('academicYear') academicYear?: string,
  ) {
    const studentId = this.resolveStudentId(req)
    return this.service.getMySelectionsV2(studentId, academicYear)
  }

  // ── Admin selection management (new architecture) ─────────────────

  @ApiOperation({ summary: '(Адмін) Призначити ВК студенту (нова архітектура)' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/selections')
  @HttpCode(HttpStatus.CREATED)
  public adminAssignV2(@Req() req: Request & { user: User }, @Body() dto: AdminAssignV2Dto) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.adminAssignV2(dto, adminId)
  }

  @ApiOperation({ summary: '(Адмін) Масове автопризначення наказом (нова архітектура)' })
  @ApiParam({ name: 'seasonId' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/seasons/:seasonId/auto-assign')
  @HttpCode(HttpStatus.OK)
  public autoAssignBulk(
    @Req() req: Request & { user: User },
    @Param('seasonId') seasonId: string,
    @Body() dto: AutoAssignBulkDto,
  ) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.autoAssignBulk(seasonId, dto, adminId)
  }

  @ApiOperation({ summary: '(Адмін) Масове підтвердження (нова архітектура)' })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/confirm-selections')
  @HttpCode(HttpStatus.OK)
  public confirmSelectionsV2(
    @Req() req: Request & { user: User },
    @Query('academicYear') academicYear: string,
  ) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.confirmSelectionsV2(academicYear, adminId)
  }

  @ApiOperation({ summary: '(Адмін) Статистика вибору по групі (нова архітектура)' })
  @ApiParam({ name: 'groupId' })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('TEACHER', 'HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/group/:groupId/stats-v2')
  @HttpCode(HttpStatus.OK)
  public getGroupStatsV2(
    @Param('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getGroupSelectionStatsV2(groupId, academicYear)
  }

  @ApiOperation({ summary: '(Адмін) Список зарахування (нова архітектура)' })
  @ApiQuery({ name: 'seasonId', required: true })
  @ApiQuery({ name: 'componentId', required: true })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/enrollment-list-v2')
  @HttpCode(HttpStatus.OK)
  public getEnrollmentListV2(
    @Query('seasonId') seasonId: string,
    @Query('componentId') componentId: string,
  ) {
    return this.service.getEnrollmentListV2(seasonId, componentId)
  }

  @ApiOperation({ summary: '(Адмін) Студенти без вибору (нова архітектура)' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'seasonId', required: true })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/unselected-v2')
  @HttpCode(HttpStatus.OK)
  public getUnselectedV2(
    @Query('groupId') groupId: string,
    @Query('seasonId') seasonId: string,
  ) {
    return this.service.getStudentsWithoutSelectionV2(groupId, seasonId)
  }

  // ── Deprecated: old catalog + selection routes ────────────────────

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Каталог ВК для ОПП' })
  @ApiQuery({ name: 'oppCode', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  @Get('catalog')
  @HttpCode(HttpStatus.OK)
  public getCatalog(
    @Query('oppCode') oppCode: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getCatalog(oppCode, academicYear)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Обрати ВК (студент)' })
  @Post('select')
  @HttpCode(HttpStatus.CREATED)
  public selectElective(@Req() req: Request & { user: User }, @Body() dto: SelectElectiveDto) {
    const studentId = this.resolveStudentId(req)
    return this.service.selectElective(studentId, dto)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Скасувати вибір ВК (студент)' })
  @ApiParam({ name: 'id', description: 'ID реєстрації' })
  @Delete('select/:id')
  @HttpCode(HttpStatus.OK)
  public cancelSelection(@Req() req: Request & { user: User }, @Param('id') id: string) {
    const studentId = this.resolveStudentId(req)
    return this.service.cancelSelection(id, studentId)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Мої вибрані ВК (студент)' })
  @ApiQuery({ name: 'academicYear', required: false })
  @Get('my')
  @HttpCode(HttpStatus.OK)
  public getMySelections(
    @Req() req: Request & { user: User },
    @Query('academicYear') academicYear?: string,
  ) {
    const studentId = this.resolveStudentId(req)
    return this.service.getMySelections(studentId, academicYear)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Статистика вибору ВК по групі' })
  @ApiParam({ name: 'groupId' })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('TEACHER', 'HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('group/:groupId/stats')
  @HttpCode(HttpStatus.OK)
  public getGroupStats(
    @Param('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getGroupSelectionStats(groupId, academicYear)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Всі ВК каталогу (адмін)' })
  @ApiQuery({ name: 'academicYear', required: false })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/catalog')
  @HttpCode(HttpStatus.OK)
  public getAllCatalog(@Query('academicYear') academicYear?: string) {
    return this.service.getAllCatalog(academicYear)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Додати ВК до каталогу (адмін)' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/catalog')
  @HttpCode(HttpStatus.CREATED)
  public createComponent(@Body() dto: CreateElectiveComponentDto) {
    return this.service.createComponent(dto)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Редагувати ВК (адмін)' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/catalog/:id')
  @HttpCode(HttpStatus.OK)
  public updateComponent(@Param('id') id: string, @Body() dto: UpdateElectiveComponentDto) {
    return this.service.updateComponent(id, dto)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Видалити ВК (адмін)' })
  @ApiParam({ name: 'id' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Delete('admin/catalog/:id')
  @HttpCode(HttpStatus.OK)
  public deleteComponent(@Param('id') id: string) {
    return this.service.deleteComponent(id)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Клонувати каталог ВК (адмін)' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/catalog/clone')
  @HttpCode(HttpStatus.CREATED)
  public cloneCatalog(@Body() dto: CloneElectiveCatalogDto) {
    return this.service.cloneCatalog(dto)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Змінити статус каталогу (адмін)' })
  @ApiParam({ name: 'id' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Patch('admin/catalog/:id/status')
  @HttpCode(HttpStatus.OK)
  public updateCatalogStatus(@Param('id') id: string, @Body() dto: UpdateCatalogStatusDto) {
    return this.service.updateCatalogStatus(id, dto)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Терми навчального плану для прив\'язки' })
  @ApiQuery({ name: 'oppCode', required: false })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/curriculum-terms')
  @HttpCode(HttpStatus.OK)
  public getCurriculumTerms(@Query('oppCode') oppCode?: string) {
    return this.service.getCurriculumTermsForLinking(oppCode)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Призначити ВК студенту (адмін)' })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/assign')
  @HttpCode(HttpStatus.CREATED)
  public adminAssign(@Req() req: Request & { user: User }, @Body() dto: AdminAssignDto) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.adminAssignElective(dto, adminId)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Масове підтвердження (адмін)' })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Post('admin/confirm-all')
  @HttpCode(HttpStatus.OK)
  public confirmAll(
    @Req() req: Request & { user: User },
    @Query('academicYear') academicYear: string,
  ) {
    const adminId = (req.user as unknown as { id: string }).id
    return this.service.confirmSelections(academicYear, adminId)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Список зарахування (Додаток 3)' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'electiveId', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/enrollment-list')
  @HttpCode(HttpStatus.OK)
  public getEnrollmentList(
    @Query('groupId') groupId: string,
    @Query('electiveId') electiveId: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getGroupEnrollmentList(groupId, electiveId, academicYear)
  }

  /** @deprecated */
  @ApiOperation({ summary: '[deprecated] Студенти без вибору ВК' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'semester', required: true, type: Number })
  @ApiQuery({ name: 'academicYear', required: true })
  @Authorization('HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR')
  @Get('admin/unselected')
  @HttpCode(HttpStatus.OK)
  public getUnselected(
    @Query('groupId') groupId: string,
    @Query('semester') semester: string,
    @Query('academicYear') academicYear: string,
  ) {
    return this.service.getStudentsWithoutSelection(groupId, +semester, academicYear)
  }

  // ── Private helpers ───────────────────────────────────────────────

  private resolveStudentId(req: Request & { user: User }): string {
    return (
      (req.user as unknown as { studentId?: string }).studentId ??
      (req.user as unknown as { id: string }).id
    )
  }
}
