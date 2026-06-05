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

import { CreateCurriculumDto } from './dto/create-curriculum.dto'
import { UpdateCurriculumDto } from './dto/update-curriculum.dto'
import { CurriculaService } from './curricula.service'

@ApiTags('Навчальний план — Навчальні плани')
@ApiBearerAuth('access-token')
@Controller('curricula')
@Authorization()
export class CurriculaController {
  public constructor(private readonly curriculaService: CurriculaService) {}

  @ApiOperation({ summary: 'Отримати всі навчальні плани' })
  @ApiQuery({ name: 'programId', required: false })
  @ApiQuery({ name: 'entryYear', required: false, type: Number })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll(
    @Query('programId') programId?: string,
    @Query('entryYear') entryYear?: string,
  ) {
    return this.curriculaService.findAll(programId, entryYear ? Number(entryYear) : undefined)
  }

  @ApiOperation({ summary: 'Отримати навчальний план за ID' })
  @ApiParam({ name: 'id', description: 'UUID навчального плану' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public findById(@Param('id') id: string) {
    return this.curriculaService.findById(id)
  }

  @ApiOperation({ summary: 'Отримати версії навчального плану' })
  @ApiParam({ name: 'id', description: 'UUID навчального плану' })
  @Get(':id/versions')
  @HttpCode(HttpStatus.OK)
  public getVersions(@Param('id') id: string) {
    return this.curriculaService.getVersions(id)
  }

  @ApiOperation({ summary: 'Створити навчальний план' })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 400, description: 'Дублікат або невалідні дані' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public create(@Body() dto: CreateCurriculumDto) {
    return this.curriculaService.create(dto)
  }

  @ApiOperation({ summary: 'Оновити навчальний план' })
  @ApiParam({ name: 'id', description: 'UUID навчального плану' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public update(@Param('id') id: string, @Body() dto: UpdateCurriculumDto) {
    return this.curriculaService.update(id, dto)
  }

  @ApiOperation({ summary: 'Видалити навчальний план (лише якщо немає версій)' })
  @ApiParam({ name: 'id', description: 'UUID навчального плану' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'План має версії або прив\'язані групи' })
  @ApiResponse({ status: 404, description: 'Не знайдено' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR, UserRole.ADMINISTRATOR)
  public async deleteCurriculum(@Param('id') id: string) {
    await this.curriculaService.deleteCurriculum(id)
    return { deleted: true }
  }
}
