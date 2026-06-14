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
import type { Request } from 'express'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'

import { UserRole } from '@prisma/client'

import { Authorized } from '@/auth/decorators/authorized.decorator'
import { Authorization } from '@/auth/decorators/auth.decorator'

import {
  ConfirmSubjectAssignmentsDto,
  RevokeSubjectAssignmentsDto,
  SetDistributionModeDto,
  UpdateLessonAssignmentDto,
  UpdateSubjectAssignmentDto,
} from './dto/subject-assignment.dto'
import { SubjectAssignmentsService } from './subject-assignments.service'
import { TeacherLoadService } from './teacher-load.service'

/** Ролі, що керують навантаженням (перегляд усіх + редагування чернеток). */
const MANAGER_ROLES = [
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

@ApiTags('Навчальний план — Педагогічне навантаження')
@ApiBearerAuth('access-token')
@Controller('teacher-load')
// За замовчуванням доступ лише керівництву; окремі ендпоінти послаблюють/звужують.
@Authorization(...MANAGER_ROLES)
export class TeacherLoadController {
  public constructor(
    private readonly teacherLoadService: TeacherLoadService,
    private readonly subjectAssignmentsService: SubjectAssignmentsService,
  ) {}

  // ── Teacher self-service ───────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Моє педагогічне навантаження (для викладача)',
    description:
      'Повертає агреговане навантаження поточного користувача-викладача ' +
      '(резолвиться за сесією). Доступно викладачам і керівництву.',
  })
  @ApiQuery({ name: 'academicYear', required: false, example: '2024-2025' })
  @ApiResponse({ status: 200, description: 'MyTeacherLoadDto' })
  @Authorization(UserRole.TEACHER, ...MANAGER_ROLES)
  @Get('my')
  @HttpCode(HttpStatus.OK)
  public getMy(
    @Authorized('id') userId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.teacherLoadService.generateMyLoad(userId, academicYear)
  }

  // ── Manager overview ───────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Зведене навантаження по всіх викладачах за рік',
    description: 'Лише для керівництва. Агрегує всі робочі плани навчального року.',
  })
  @ApiQuery({ name: 'academicYear', required: true, example: '2024-2025' })
  @ApiResponse({ status: 200, description: 'AllTeachersLoadDto' })
  @Get('by-all-teachers')
  @HttpCode(HttpStatus.OK)
  public getAllTeachers(@Query('academicYear') academicYear: string) {
    return this.teacherLoadService.generateAllTeachersSummary(academicYear)
  }

  // ── Read-only computation ──────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Педагогічне навантаження по робочому навчальному плану',
    description:
      'Динамічно генерує зведення навантаження: групує компоненти по викладачах, ' +
      'застосовує правила множення годин (лекції × 1, решта × groupCount), ' +
      'повертає інформаційні сигнали щодо нормативів МОН №686.',
  })
  @ApiParam({ name: 'id', description: 'UUID робочого навчального плану' })
  @ApiResponse({ status: 200, description: 'TeacherLoadDto' })
  @ApiResponse({ status: 404, description: 'Робочий план не знайдено' })
  @Get('by-working-curriculum/:id')
  @HttpCode(HttpStatus.OK)
  public getByWorkingCurriculum(@Param('id') id: string) {
    return this.teacherLoadService.generateByWorkingCurriculum(id)
  }

  @ApiOperation({
    summary: 'Педагогічне навантаження по викладачу',
    description:
      'Повертає список TeacherLoadDto для всіх робочих планів, ' +
      'де цей викладач веде хоча б один компонент. ' +
      'Може бути відфільтровано за навчальним роком.',
  })
  @ApiParam({ name: 'teacherId', description: 'UUID викладача' })
  @ApiQuery({ name: 'academicYear', required: false, example: '2024-2025' })
  @ApiResponse({ status: 200, description: 'TeacherLoadDto[]' })
  @ApiResponse({ status: 404, description: 'Викладача не знайдено' })
  @Get('by-teacher/:teacherId')
  @HttpCode(HttpStatus.OK)
  public getByTeacher(
    @Param('teacherId') teacherId: string,
    @Query('academicYear') academicYear?: string,
  ) {
    return this.teacherLoadService.generateByTeacher(teacherId, academicYear)
  }

  // ── Subject assignments ────────────────────────────────────────────────────

  @ApiOperation({
    summary: 'Згенерувати DRAFT subject assignments',
    description:
      'Автоматично створює DRAFT записи з бюджету годин робочого плану. ' +
      'LECTURE → stream subject (groupId=null). ' +
      'PRACTICE/LAB/SEMINAR/CONSULTATION/SPRS → окремий subject на кожну активну групу. ' +
      'Призначення викладачів з попередніх DRAFT зберігаються. ' +
      'CONFIRMED-записи не чіпаються.',
  })
  @ApiParam({ name: 'workingCurriculumId', description: 'UUID робочого плану' })
  @ApiResponse({ status: 201, description: 'SubjectAssignmentDto[]' })
  @Post('subject-assignments/generate/:workingCurriculumId')
  @HttpCode(HttpStatus.CREATED)
  public generate(
    @Param('workingCurriculumId') workingCurriculumId: string,
    @Authorized('id') userId: string,
  ) {
    return this.subjectAssignmentsService.generate(workingCurriculumId, userId)
  }

  @ApiOperation({ summary: 'Отримати subject assignments по робочому плану' })
  @ApiQuery({ name: 'workingCurriculumId', description: 'UUID робочого плану' })
  @ApiResponse({ status: 200, description: 'SubjectAssignmentDto[]' })
  @Get('subject-assignments')
  @HttpCode(HttpStatus.OK)
  public findAll(@Query('workingCurriculumId') workingCurriculumId: string) {
    return this.subjectAssignmentsService.findAll(workingCurriculumId)
  }

  @ApiOperation({
    summary: 'Оновити основного викладача компонента',
    description:
      'Оновлює primaryTeacherId subject assignment. ' +
      'Lesson overrides не змінюються — effectiveTeacher перераховується автоматично. ' +
      '[HARD BLOCK] якщо статус CONFIRMED.',
  })
  @ApiParam({ name: 'id', description: 'UUID subject assignment' })
  @ApiResponse({ status: 200, description: 'SubjectAssignmentDto' })
  @ApiResponse({ status: 400, description: 'Підтверджені записи не можна редагувати' })
  @ApiResponse({ status: 404, description: 'Subject assignment не знайдено' })
  @Patch('subject-assignments/:id')
  @HttpCode(HttpStatus.OK)
  public updateSubjectAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateSubjectAssignmentDto,
    @Authorized('id') userId: string,
  ) {
    return this.subjectAssignmentsService.updateSubject(id, dto, userId)
  }

  @ApiOperation({
    summary: 'Оновити викладача-виняток для виду заняття',
    description:
      'Оновлює overrideTeacherId lesson assignment. ' +
      'Якщо override == primary → автоматично очищається до null. ' +
      '[HARD BLOCK] subgroupNumber для LECTURE/SEMINAR/CONSULTATION/SPRS. ' +
      '[SOFT WARN] менше 10 студентів у підгрупі.',
  })
  @ApiParam({ name: 'id', description: 'UUID lesson assignment' })
  @ApiResponse({ status: 200, description: 'LessonAssignmentDto' })
  @ApiResponse({ status: 400, description: 'Підтверджені записи / заборонена підгрупа' })
  @ApiResponse({ status: 404, description: 'Lesson assignment не знайдено' })
  @Patch('lesson-assignments/:id')
  @HttpCode(HttpStatus.OK)
  public updateLessonAssignment(
    @Param('id') id: string,
    @Body() dto: UpdateLessonAssignmentDto,
    @Authorized('id') userId: string,
  ) {
    return this.subjectAssignmentsService.updateLesson(id, dto, userId)
  }

  @ApiOperation({
    summary: 'Змінити режим розподілу практик/лаб (потік ↔ по групах)',
    description:
      'Оновлює practiceMode/labMode для ОК-семестру робочого плану і ' +
      'перегенеровує DRAFT-призначення під новий режим. [HARD BLOCK] якщо є CONFIRMED.',
  })
  @ApiResponse({ status: 200, description: 'SubjectAssignmentDto[] (перегенеровано)' })
  @ApiResponse({ status: 400, description: 'Навантаження вже підтверджено наказом' })
  @Patch('distribution-mode')
  @HttpCode(HttpStatus.OK)
  public setDistributionMode(
    @Body() dto: SetDistributionModeDto,
    @Authorized('id') userId: string,
  ) {
    return this.subjectAssignmentsService.setDistributionMode(dto, userId)
  }

  @ApiOperation({
    summary: 'Підтвердити навантаження наказом директора',
    description:
      'Переводить усі DRAFT записи у CONFIRMED, записує номер і дату наказу. ' +
      'Доступно лише ролям DIRECTOR та ADMINISTRATOR. ' +
      '[HARD BLOCK] якщо хтось з викладачів перевищує 720 × rate год/рік. ' +
      '[SOFT WARN] дата наказу після 01.09, підтвердження ADMINISTRATOR, відсутність погодження профспілки. ' +
      'Повертає ConfirmSubjectAssignmentsResultDto з попередженнями.',
  })
  @ApiResponse({ status: 200, description: 'ConfirmSubjectAssignmentsResultDto' })
  @ApiResponse({ status: 400, description: 'Немає DRAFT-записів / перевищення ліміту годин' })
  @ApiResponse({ status: 403, description: 'Потрібна роль DIRECTOR або ADMINISTRATOR' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Post('subject-assignments/confirm')
  @HttpCode(HttpStatus.OK)
  public confirm(
    @Body() dto: ConfirmSubjectAssignmentsDto,
    @Authorized('id') userId: string,
  ) {
    return this.subjectAssignmentsService.confirm(dto, userId)
  }

  @ApiOperation({
    summary: 'Скасувати наказ (повернути навантаження у чернетку)',
    description:
      'Повертає всі CONFIRMED записи робочого плану у статус DRAFT, очищає ' +
      'номер/дату наказу та підпис директора. Дія фіксується в журналі аудиту. ' +
      'Лише ролі DIRECTOR та ADMINISTRATOR.',
  })
  @ApiResponse({ status: 200, description: 'RevokeSubjectAssignmentsResultDto' })
  @ApiResponse({ status: 400, description: 'Немає підтверджених записів' })
  @ApiResponse({ status: 403, description: 'Потрібна роль DIRECTOR або ADMINISTRATOR' })
  @Authorization('DIRECTOR', 'ADMINISTRATOR')
  @Post('subject-assignments/revoke')
  @HttpCode(HttpStatus.OK)
  public revoke(
    @Body() dto: RevokeSubjectAssignmentsDto,
    @Authorized('id') userId: string,
    @Req() req: Request,
  ) {
    return this.subjectAssignmentsService.revoke(dto, userId, req)
  }
}
