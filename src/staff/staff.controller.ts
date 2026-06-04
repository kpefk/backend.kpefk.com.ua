import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Teacher } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { StaffService } from './staff.service'

/**
 * Контролер для роботи зі списком викладачів.
 * Дані доступні будь-якому авторизованому користувачу.
 * Синхронізація з ЄДЕБО — окремий маршрут POST /edbo/sync/staff (тільки адміністратор).
 */
@ApiTags('Викладачі')
@ApiBearerAuth('access-token')
@Controller('staff')
@Authorization()
export class StaffController {
  public constructor(private readonly staffService: StaffService) {}

  /**
   * Повертає повний список викладачів.
   * Сортування: прізвище → ім'я (asc).
   * Фільтрація виконується на клієнті.
   */
  @ApiOperation({ summary: 'Отримати список викладачів' })
  @ApiResponse({ status: 200, description: 'Список викладачів' })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public async findAll(): Promise<Teacher[]> {
    return this.staffService.findAll()
  }

  /**
   * Повертає одного викладача за UUID.
   */
  @ApiOperation({ summary: 'Отримати викладача за ID' })
  @ApiParam({ name: 'id', description: 'UUID викладача' })
  @ApiResponse({ status: 200, description: 'Знайдений викладач' })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @ApiResponse({ status: 404, description: 'Викладача не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public async findById(@Param('id') id: string): Promise<Teacher> {
    return this.staffService.findById(id)
  }
}
