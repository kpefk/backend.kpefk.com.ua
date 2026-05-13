import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Delete
} from '@nestjs/common'
import { User, UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { AdminService } from './admin.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserByAdminDto } from './dto/update-user-by-admin.dto'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Контролер для управління користувачами адміністратором.
 */
@ApiTags('Адміністратор')
@ApiBearerAuth('access-token')
@Controller('admin')
@Authorization(UserRole.ADMINISTRATOR)
export class AdminController {
  /**
   * Конструктор контролера адміністратора.
   * @param adminService - Сервіс для управління користувачами.
   */
  public constructor(private readonly adminService: AdminService) {}

  /**
   * Повертає список всіх користувачів.
   * @returns Список користувачів.
   */
  @ApiOperation({ summary: 'Отримати список всіх користувачів' })
  @ApiResponse({ status: 200, description: 'Список користувачів' })
  @Get('users')
  @HttpCode(HttpStatus.OK)
  public async findAll(): Promise<User[]> {
    return this.adminService.findAll()
  }

  /**
   * Повертає користувача за ID.
   * @param id - ID користувача.
   * @returns Знайдений користувач.
   */
  @ApiOperation({ summary: 'Отримати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Знайдений користувач' })
  @ApiResponse({ status: 404, description: 'Користувач не знайдений' })
  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  public async findById(@Param('id') id: string): Promise<User> {
    return this.adminService.findById(id)
  }

  /**
   * Створює нового користувача.
   * @param dto - Дані для створення користувача.
   * @returns Створений користувач.
   */
  @ApiOperation({ summary: 'Створити нового користувача' })
  @ApiResponse({ status: 201, description: 'Створений користувач' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  public async create(@Body() dto: CreateUserDto): Promise<User> {
    return this.adminService.create(dto)
  }

  /**
   * Оновлює дані користувача.
   * @param id - ID користувача.
   * @param dto - Дані для оновлення користувача.
   * @returns Оновлений користувач.
   */
  @ApiOperation({ summary: 'Оновити користувача за ID' })
  @ApiResponse({ status: 200, description: 'Оновлений користувач' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Користувач не знайдений' })
  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserByAdminDto
  ): Promise<User> {
    return this.adminService.update(id, dto)
  }

  /**
   * Деактивує користувача.
   * @param id - ID користувача.
   * @returns Деактивований користувач.
   */
  @ApiOperation({ summary: 'Деактивувати користувача за ID' })
  @ApiResponse({ status: 200, description: 'Деактивований користувач' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Користувач не знайдений' })
  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  public async deactivate(@Param('id') id: string): Promise<User> {
    return this.adminService.deactivate(id)
  }
}