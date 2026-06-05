import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { UpdateEducationalProgramDto } from './dto/update-educational-program.dto'
import { EducationalProgramsService } from './educational-programs.service'

@ApiTags('Навчальний план — Освітні програми (ОПП)')
@ApiBearerAuth('access-token')
@Controller('educational-programs')
@Authorization()
export class EducationalProgramsController {
  public constructor(private readonly programsService: EducationalProgramsService) {}

  @ApiOperation({ summary: 'Отримати всі освітні програми' })
  @ApiQuery({ name: 'specialtyId', required: false, description: 'Фільтр за спеціальністю' })
  @ApiResponse({ status: 200 })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll(@Query('specialtyId') specialtyId?: string) {
    return this.programsService.findAll(specialtyId)
  }

  @ApiOperation({ summary: 'Отримати освітню програму за ID' })
  @ApiParam({ name: 'id', description: 'UUID програми' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.programsService.findById(id)
  }

  @ApiOperation({ summary: 'Оновити освітню програму' })
  @ApiParam({ name: 'id', description: 'UUID програми' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public update(@Param('id') id: string, @Body() dto: UpdateEducationalProgramDto) {
    return this.programsService.update(id, dto)
  }

  @ApiOperation({ summary: 'Деактивувати освітню програму' })
  @ApiParam({ name: 'id', description: 'UUID програми' })
  @Patch(':id/deactivate')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.ADMINISTRATOR)
  public deactivate(@Param('id') id: string) {
    return this.programsService.deactivate(id)
  }
}
