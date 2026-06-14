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
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CreateWorkingAssignmentDto } from './dto/create-working-assignment.dto'
import { CreateWorkingCurriculumDto } from './dto/create-working-curriculum.dto'
import { UpdateWorkingCurriculumDto } from './dto/update-working-curriculum.dto'
import { UpsertWorkingComponentTermDto } from './dto/upsert-working-component-term.dto'
import { WorkingCurriculaService } from './working-curricula.service'

const WRITE_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.SCHEDULE_DISPATCHER,
  UserRole.ADMINISTRATOR,
]

@ApiTags('Навчальний план — Робочі навчальні плани')
@ApiBearerAuth('access-token')
@Controller('working-curricula')
@Authorization()
export class WorkingCurriculaController {
  public constructor(private readonly workingCurriculaService: WorkingCurriculaService) {}

  @ApiOperation({ summary: 'Отримати всі робочі навчальні плани' })
  @ApiQuery({ name: 'versionId', required: false })
  @ApiQuery({ name: 'academicYear', required: false })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll(
    @Query('versionId') versionId?: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.workingCurriculaService.findAll(versionId, academicYear)
  }

  @ApiOperation({ summary: 'Отримати робочий план за ID з розбивкою годин' })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.workingCurriculaService.findById(id)
  }

  @ApiOperation({
    summary: 'Отримати snapshot-призначення робочих планів для групи (аудит)',
    deprecated: true,
    description:
      'Повертає historical snapshot layer (GroupWorkingCurriculumAssignment). ' +
      'Для поточного членства групи використовуйте GroupCurriculumAssignment.',
  })
  @ApiParam({ name: 'groupId', description: 'UUID групи' })
  @ApiQuery({ name: 'academicYear', required: false })
  @Get('by-group/:groupId')
  @HttpCode(HttpStatus.OK)
  public findForGroup(
    @Param('groupId') groupId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.workingCurriculaService.findWorkingCurriculumForGroup(groupId, academicYear)
  }

  @ApiOperation({ summary: 'Створити робочий навчальний план' })
  @ApiResponse({ status: 201 })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public create(@Body() dto: CreateWorkingCurriculumDto) {
    return this.workingCurriculaService.create(dto)
  }

  @ApiOperation({ summary: 'Оновити робочий навчальний план' })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public update(@Param('id') id: string, @Body() dto: UpdateWorkingCurriculumDto) {
    return this.workingCurriculaService.update(id, dto)
  }

  @ApiOperation({
    summary: 'Видалити порожній робочий навчальний план',
    description:
      'Дозволено лише для незатвердженого плану без прив\'язаних груп і без внесеного розподілу годин.',
  })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 400, description: 'Затверджений, непорожній або з прив\'язаними групами' })
  @ApiResponse({ status: 404 })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Authorization(...WRITE_ROLES)
  public async delete(@Param('id') id: string) {
    await this.workingCurriculaService.delete(id)
  }

  @ApiOperation({ summary: 'Затвердити робочий навчальний план' })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public approve(@Param('id') id: string) {
    return this.workingCurriculaService.approve(id)
  }

  @ApiOperation({
    summary: 'Ініціалізувати рядки розподілу годин',
    description:
      'Ідемпотентно створює WorkingCurriculumComponentTerm для всіх канонічних термів версії. ' +
      'Наявні рядки не перезаписуються. Безпечно викликати повторно.',
  })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @ApiResponse({ status: 200 })
  @Post(':id/initialize-terms')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public initializeTerms(@Param('id') id: string) {
    return this.workingCurriculaService.initializeTerms(id)
  }

  @ApiOperation({
    summary: 'Встановити або оновити розбивку годин для компонента (upsert)',
  })
  @ApiParam({ name: 'id', description: 'UUID робочого плану' })
  @Post(':id/component-terms')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public upsertComponentTerm(
    @Param('id') id: string,
    @Body() dto: UpsertWorkingComponentTermDto,
  ) {
    return this.workingCurriculaService.upsertComponentTerm(id, dto)
  }

  @ApiOperation({
    summary: "Прив'язати групу до робочого навчального плану (snapshot-запис)",
    deprecated: true,
    description:
      'Створює explicit snapshot у GroupWorkingCurriculumAssignment. ' +
      'Поточне членство груп визначається через нормативний шар (GroupCurriculumAssignment). ' +
      'Цей ендпоінт зарезервований для адміністративних override-операцій.',
  })
  @ApiResponse({ status: 201 })
  @Post('group-assignments')
  @HttpCode(HttpStatus.CREATED)
  @Authorization(...WRITE_ROLES)
  public createWorkingAssignment(@Body() dto: CreateWorkingAssignmentDto) {
    return this.workingCurriculaService.createWorkingAssignment(dto)
  }
}
