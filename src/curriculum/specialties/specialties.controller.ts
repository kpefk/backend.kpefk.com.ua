import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CreateSpecialtyDto } from './dto/create-specialty.dto'
import { UpdateSpecialtyDto } from './dto/update-specialty.dto'
import { SpecialtiesService } from './specialties.service'

@ApiTags('Навчальний план — Спеціальності')
@ApiBearerAuth('access-token')
@Controller('specialties')
@Authorization()
export class SpecialtiesController {
  public constructor(private readonly specialtiesService: SpecialtiesService) {}

  @ApiOperation({ summary: 'Отримати всі спеціальності' })
  @ApiResponse({ status: 200, description: 'Список спеціальностей' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll() {
    return this.specialtiesService.findAll()
  }

  @ApiOperation({ summary: 'Отримати спеціальність за ID' })
  @ApiParam({ name: 'id', description: 'UUID спеціальності' })
  @ApiResponse({ status: 200, description: 'Спеціальність з програмами' })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.specialtiesService.findById(id)
  }

  @ApiOperation({ summary: 'Створити спеціальність' })
  @ApiResponse({ status: 201, description: 'Створено' })
  @ApiResponse({ status: 400, description: 'Дублікат коду' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public create(@Body() dto: CreateSpecialtyDto) {
    return this.specialtiesService.create(dto)
  }

  @ApiOperation({ summary: 'Оновити спеціальність' })
  @ApiParam({ name: 'id', description: 'UUID спеціальності' })
  @ApiResponse({ status: 200, description: 'Оновлено' })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public update(@Param('id') id: string, @Body() dto: UpdateSpecialtyDto) {
    return this.specialtiesService.update(id, dto)
  }

  @ApiOperation({ summary: 'Деактивувати спеціальність' })
  @ApiParam({ name: 'id', description: 'UUID спеціальності' })
  @ApiResponse({ status: 200, description: 'Деактивовано' })
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.ADMINISTRATOR)
  public deactivate(@Param('id') id: string) {
    return this.specialtiesService.deactivate(id)
  }
}
