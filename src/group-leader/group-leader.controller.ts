import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import type { Request, Response } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { GroupLeaderGuard } from './guards/group-leader.guard'
import { GroupLeaderService } from './group-leader.service'
import { UpdateParentInfoDto } from './dto/update-parent-info.dto'

@ApiTags('Керівник групи')
@ApiBearerAuth('access-token')
@Controller()
@Authorization()
export class GroupLeaderController {
  public constructor(private readonly service: GroupLeaderService) {}

  // ── My groups ──────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Групи, де поточний викладач є куратором' })
  @Get('group-leader/my-groups')
  @HttpCode(HttpStatus.OK)
  public getMyGroups(@Req() req: Request & { user: { id: string } }) {
    return this.service.getMyGroups(req.user.id)
  }

  // ── Students (guarded by GroupLeaderGuard) ────────────────────────────────

  @ApiOperation({ summary: 'Список студентів групи з батьківськими контактами' })
  @ApiParam({ name: 'groupId' })
  @UseGuards(GroupLeaderGuard)
  @Get('group-leader/:groupId/students')
  @HttpCode(HttpStatus.OK)
  public getGroupStudents(@Param('groupId') groupId: string) {
    return this.service.getGroupStudents(groupId)
  }

  @ApiOperation({ summary: 'Профіль студента + контакти батьків' })
  @ApiParam({ name: 'groupId' })
  @ApiParam({ name: 'studentId' })
  @UseGuards(GroupLeaderGuard)
  @Get('group-leader/:groupId/students/:studentId')
  @HttpCode(HttpStatus.OK)
  public getStudent(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.service.getStudent(groupId, studentId)
  }

  @ApiOperation({ summary: 'Оновити контакти батьків (upsert)' })
  @ApiParam({ name: 'groupId' })
  @ApiParam({ name: 'studentId' })
  @UseGuards(GroupLeaderGuard)
  @Put('group-leader/:groupId/students/:studentId/parent-info')
  @HttpCode(HttpStatus.OK)
  public upsertParentInfo(
    @Param('groupId') groupId: string,
    @Param('studentId') studentId: string,
    @Body() dto: UpdateParentInfoDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.service.upsertParentInfo(groupId, studentId, dto, req.user.id, req)
  }

  @ApiOperation({ summary: 'Завантажити список групи у форматі Excel' })
  @ApiParam({ name: 'groupId' })
  @UseGuards(GroupLeaderGuard)
  @Get('group-leader/:groupId/export')
  public async exportExcel(
    @Param('groupId') groupId: string,
    @Res() res: Response,
  ) {
    const buf = await this.service.exportGroupExcel(groupId)
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="group-${groupId}.xlsx"`)
    res.end(buf)
  }

  // ── Admin: parent info without groupId (HEAD_OF_DEPARTMENT+) ─────────────

  @ApiOperation({ summary: '(Адмін) Контакти батьків студента' })
  @ApiParam({ name: 'studentId' })
  @Authorization(
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Get('students/:studentId/parent-info')
  @HttpCode(HttpStatus.OK)
  public getParentInfoAdmin(@Param('studentId') studentId: string) {
    return this.service.getParentInfoAdmin(studentId)
  }

  @ApiOperation({ summary: '(Адмін) Оновити контакти батьків студента' })
  @ApiParam({ name: 'studentId' })
  @Authorization(
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Put('students/:studentId/parent-info')
  @HttpCode(HttpStatus.OK)
  public upsertParentInfoAdmin(
    @Param('studentId') studentId: string,
    @Body() dto: UpdateParentInfoDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.service.upsertParentInfoAdmin(studentId, dto, req.user.id, req)
  }
}
