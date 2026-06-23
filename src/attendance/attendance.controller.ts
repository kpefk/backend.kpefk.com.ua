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
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger'

import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { ATTENDANCE_ROLES } from './attendance.constants'
import { AttendanceService, type Actor } from './attendance.service'
import {
  ListLessonsQueryDto,
  OpenSessionDto,
  SaveRecordsDto,
  UpdateSessionDto,
} from './dto/attendance.dto'

@ApiTags('Журнал відвідуваності')
@ApiBearerAuth('access-token')
@Controller('attendance')
@Authorization(...ATTENDANCE_ROLES)
export class AttendanceController {
  public constructor(private readonly attendanceService: AttendanceService) {}

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

  private actor(userId: string, role: UserRole): Actor {
    return { userId, role }
  }
}
