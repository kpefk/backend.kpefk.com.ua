import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Response } from 'express'

import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { ATTENDANCE_ROLES } from './attendance.constants'
import { AttendanceService, type Actor } from './attendance.service'
import { AttendanceSummaryService } from './attendance-summary.service'
import { JournalService } from './journal.service'
import {
  ListLessonsQueryDto,
  OpenSessionDto,
  SaveRecordsDto,
  UpdateSessionDto,
} from './dto/attendance.dto'
import {
  AttendanceSummaryQueryDto,
  StudentSummaryQueryDto,
} from './dto/attendance-summary.dto'

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

@ApiTags('Журнал відвідуваності')
@ApiBearerAuth('access-token')
@Controller('attendance')
@Authorization(...ATTENDANCE_ROLES)
export class AttendanceController {
  public constructor(
    private readonly attendanceService: AttendanceService,
    private readonly summaryService: AttendanceSummaryService,
    private readonly journalService: JournalService,
  ) {}

  @ApiOperation({ summary: 'Заняття на дату (для викладача — власні)' })
  @ApiQuery({ name: 'date', required: true, example: '2026-06-17' })
  @ApiQuery({ name: 'teacherId', required: false })
  @ApiQuery({ name: 'groupId', required: false })
  @Get('lessons')
  @HttpCode(HttpStatus.OK)
  public listLessons(
    @Query() query: ListLessonsQueryDto,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.listLessons(query, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Відкрити/створити сторінку журналу заняття' })
  @Post('sessions')
  @HttpCode(HttpStatus.OK)
  public openSession(
    @Body() dto: OpenSessionDto,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.openSession(dto, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Сторінка журналу (студенти + статуси/оцінки)' })
  @Get('sessions/:id')
  @HttpCode(HttpStatus.OK)
  public getSession(
    @Param('id') id: string,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.getSession(id, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Оновити тему/вид заняття' })
  @Patch('sessions/:id')
  @HttpCode(HttpStatus.OK)
  public updateSession(
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.updateSession(id, dto, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Зберегти відвідуваність та оцінки' })
  @Put('sessions/:id/records')
  @HttpCode(HttpStatus.OK)
  public saveRecords(
    @Param('id') id: string,
    @Body() dto: SaveRecordsDto,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.saveRecords(id, dto, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Перенести відвідуваність із попереднього заняття групи' })
  @Post('sessions/:id/carry-over')
  @HttpCode(HttpStatus.OK)
  public carryOver(
    @Param('id') id: string,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.attendanceService.carryOver(id, this.actor(userId, role))
  }

  @ApiOperation({ summary: 'Зведена відвідуваності по дисципліні за семестр' })
  @Get('summary')
  @HttpCode(HttpStatus.OK)
  public getAttendanceSummary(@Query() query: AttendanceSummaryQueryDto) {
    return this.summaryService.getAttendanceSummary(
      query.componentTermId,
      query.groupId,
      query.academicYear,
      query.semesterNumber,
    )
  }

  @ApiOperation({ summary: 'Зведена відвідуваності студента за семестр (студент — лише власну)' })
  // Route-level ролі перекривають class-level (getAllAndOverride): відкриваємо STUDENT
  // саме тут; ownership (IDOR-захист) перевіряється в сервісі.
  @Authorization(...ATTENDANCE_ROLES, UserRole.STUDENT)
  @Get('student-summary/:studentId')
  @HttpCode(HttpStatus.OK)
  public getStudentSemesterSummary(
    @Param('studentId') studentId: string,
    @Query() query: StudentSummaryQueryDto,
    @Authorized('id') userId: string,
    @Authorized('role') role: UserRole,
  ) {
    return this.summaryService.getStudentSemesterSummary(
      studentId,
      query.academicYear,
      query.semesterNumber,
      this.actor(userId, role),
    )
  }

  @ApiOperation({ summary: 'Журнал (DOCX): матриця оцінок + зміст занять' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'academicYear', required: true })
  @ApiQuery({ name: 'semesterNumber', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'DOCX file' })
  @Get('journal/:componentTermId')
  @HttpCode(HttpStatus.OK)
  public async generateJournal(
    @Param('componentTermId') componentTermId: string,
    @Query('groupId') groupId: string,
    @Query('academicYear') academicYear: string,
    @Query('semesterNumber') semesterNumber: string,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.journalService.generate(
      componentTermId,
      groupId,
      academicYear,
      Number(semesterNumber),
    )
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_')
    res.set({
      'Content-Type': DOCX_MIME,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Content-Length': String(buffer.length),
    })
    res.end(buffer)
  }

  private actor(userId: string, role: UserRole): Actor {
    return { userId, role }
  }
}
