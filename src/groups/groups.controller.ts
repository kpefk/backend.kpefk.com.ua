import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Roles } from '@/auth/decorators/roles.decorator'

import { AssignCuratorDto } from './dto/assign-curator.dto'
import { GroupsService } from './groups.service'

@ApiTags('Академічні групи')
@ApiBearerAuth('access-token')
@Controller('groups')
@Authorization()
export class GroupsController {
  public constructor(private readonly groupsService: GroupsService) {}

  @ApiOperation({ summary: 'Отримати список всіх груп з агрегованими даними' })
  @ApiResponse({ status: 200, description: 'Список груп' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll() {
    return this.groupsService.findAll()
  }

  @ApiOperation({ summary: 'Отримати групу за ID' })
  @ApiParam({ name: 'id', description: 'UUID групи' })
  @ApiResponse({ status: 200, description: 'Дані групи' })
  @ApiResponse({ status: 404, description: 'Групу не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.groupsService.findById(id)
  }

  @ApiOperation({ summary: 'Призначити або зняти куратора групи' })
  @ApiParam({ name: 'id', description: 'UUID групи' })
  @ApiResponse({ status: 200, description: 'Оновлена група' })
  @ApiResponse({ status: 400, description: 'Некоректні дані або конфлікт куратора' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Групу або викладача не знайдено' })
  @Patch(':id/curator')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMINISTRATOR)
  public assignCurator(
    @Param('id') id: string,
    @Body() dto: AssignCuratorDto,
  ) {
    return this.groupsService.assignCurator(id, dto)
  }
}
