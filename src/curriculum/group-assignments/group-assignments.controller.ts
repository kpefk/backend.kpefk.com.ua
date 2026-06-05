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

import { CreateGroupAssignmentDto } from './dto/create-group-assignment.dto'
import { GroupAssignmentsService } from './group-assignments.service'

@ApiTags("Навчальний план — Прив'язка груп до плану")
@ApiBearerAuth('access-token')
@Controller('group-curriculum-assignments')
@Authorization()
export class GroupAssignmentsController {
  public constructor(private readonly assignmentsService: GroupAssignmentsService) {}

  @ApiOperation({ summary: 'Отримати список призначень з фільтрами' })
  @ApiQuery({ name: 'groupId', required: false })
  @ApiQuery({ name: 'versionId', required: false })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll(
    @Query('groupId') groupId?: string,
    @Query('versionId') versionId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.assignmentsService.findAll(
      groupId,
      versionId,
      activeOnly === 'true',
    )
  }

  @ApiOperation({ summary: 'Отримати активне призначення групи' })
  @ApiParam({ name: 'groupId', description: 'UUID групи' })
  @Get('by-group/:groupId/active')
  @HttpCode(HttpStatus.OK)
  public findActiveForGroup(@Param('groupId') groupId: string) {
    return this.assignmentsService.findActiveForGroup(groupId)
  }

  @ApiOperation({ summary: 'Отримати историю призначень групи' })
  @ApiParam({ name: 'groupId', description: 'UUID групи' })
  @Get('by-group/:groupId/history')
  @HttpCode(HttpStatus.OK)
  public findHistoryForGroup(@Param('groupId') groupId: string) {
    return this.assignmentsService.findHistoryForGroup(groupId)
  }

  @ApiOperation({ summary: 'Призначити групу до версії навчального плану' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Невалідна версія або неопублікована версія' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Authorization(
    UserRole.DIRECTOR,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.ADMINISTRATOR,
  )
  public create(@Body() dto: CreateGroupAssignmentDto) {
    return this.assignmentsService.create(dto)
  }

  @ApiOperation({ summary: 'Закрити активне призначення групи' })
  @ApiParam({ name: 'id', description: 'UUID призначення' })
  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  @Authorization(
    UserRole.DIRECTOR,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.ADMINISTRATOR,
  )
  public close(@Param('id') id: string) {
    return this.assignmentsService.close(id)
  }
}
