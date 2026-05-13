import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { ClassroomService } from './classroom.service'
import { CreateClassroomDto } from './dto/create-classroom.dto'
import { UpdateClassroomDto } from './dto/update-classroom.dto'
import { ReorderPhotosDto } from './dto/reorder-photos.dto'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Контролер для управління кабінетами.
 */
@ApiTags('Навчальні кабінети')
@ApiBearerAuth('access-token')
@Controller('classrooms')
export class ClassroomController {
  /**
   * Конструктор контролера кабінетів.
   * @param classroomService - Сервіс для роботи з кабінетами.
   */
  public constructor(private readonly classroomService: ClassroomService) {}

  // ─── Основні CRUD операції ───────────────────────────────────────────────────

  /**
   * Повертає список усіх кабінетів.
   * Доступно всім авторизованим користувачам.
   * @returns Список кабінетів із інформацією про завідувача.
   */
  @ApiOperation({ summary: 'Отримати список усіх кабінетів' })
  @ApiResponse({ status: 200, description: 'Список кабінетів' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get()
  public async findAll() {
    return this.classroomService.findAll()
  }

  /**
   * Знаходить кабінет за ID.
   * Доступно всім авторизованим користувачам.
   * @param id - ID кабінету.
   * @returns Знайдений кабінет із інформацією про завідувача.
   */
  @ApiOperation({ summary: 'Знайти кабінет за ID' })
  @ApiResponse({ status: 200, description: 'Знайдений кабінет' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async findById(@Param('id') id: string) {
    return this.classroomService.findById(id)
  }

  /**
   * Створює новий кабінет.
   * Доступно тільки адміністратору.
   * @param dto - Дані для створення кабінету (номер, назва, ID завідувача).
   * @returns Створений кабінет.
   */
  @ApiOperation({ summary: 'Створити новий кабінет' })
  @ApiResponse({ status: 201, description: 'Створений кабінет' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @Authorization(UserRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.CREATED)
  @Post()
  public async create(@Body() dto: CreateClassroomDto) {
    return this.classroomService.create(dto)
  }

  /**
   * Оновлює основну інформацію кабінету.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param dto - Дані для оновлення (номер, назва, ID завідувача).
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет.
   */
  @ApiOperation({ summary: 'Оновити кабінет за ID' })
  @ApiResponse({ status: 200, description: 'Оновлений кабінет' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomDto,
    @Authorized() currentUser: { id: string; role: UserRole }
  ) {
    return this.classroomService.update(id, dto, currentUser)
  }

  /**
   * Видаляє кабінет разом із усіма фото на Google Drive.
   * Доступно тільки адміністратору.
   * @param id - ID кабінету.
   * @returns Видалений кабінет.
   */
  @ApiOperation({ summary: 'Видалити кабінет за ID' })
  @ApiResponse({ status: 200, description: 'Видалений кабінет' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR)
  @HttpCode(HttpStatus.OK)
  @Delete(':id')
  public async delete(@Param('id') id: string) {
    return this.classroomService.delete(id)
  }

  // ─── Операції з фотографіями ─────────────────────────────────────────────────

  /**
   * Завантажує нове фото кабінету на Google Drive.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * Максимальна кількість фото — 4.
   * @param id - ID кабінету.
   * @param file - Файл фото (multipart/form-data, поле "file").
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет із новим фото.
   */
  @ApiOperation({ summary: 'Завантажити фото кабінету за ID' })
  @ApiResponse({ status: 200, description: 'Оновлений кабінет із новим фото' })
  @ApiResponse({ status: 400, description: 'Невірна капча' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/photos')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // Максимальний розмір — 5MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }) // Дозволені типи файлів
        ]
      })
    )
    file: Express.Multer.File,
    @Authorized() currentUser: { id: string; role: UserRole }
  ) {
    return this.classroomService.uploadPhoto(id, file, currentUser)
  }

  /**
   * Видаляє фото кабінету з Google Drive.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param googleFileId - ID файлу на Google Drive.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет без видаленого фото.
   */
  @ApiOperation({ summary: 'Видалити фото кабінету за ID' })
  @ApiResponse({ status: 200, description: 'Оновлений кабінет без видаленого фото' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/photos/:googleFileId')
  public async deletePhoto(
    @Param('id') id: string,
    @Param('googleFileId') googleFileId: string,
    @Authorized() currentUser: { id: string; role: UserRole }
  ) {
    return this.classroomService.deletePhoto(id, googleFileId, currentUser)
  }

  /**
   * Змінює порядок фото кабінету після Drag & Drop на фронті.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param dto - Масив об'єктів із googleFileId та новим order для кожного фото.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет із новим порядком фото.
   */
  @ApiOperation({ summary: 'Змінити порядок фото кабінету за ID' })
  @ApiResponse({ status: 200, description: 'Оновлений кабінет із новим порядком фото' })
  @ApiResponse({ status: 403, description: 'Доступ заборонено' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Patch(':id/photos/reorder')
  public async reorderPhotos(
    @Param('id') id: string,
    @Body() dto: ReorderPhotosDto,
    @Authorized() currentUser: { id: string; role: UserRole }
  ) {
    return this.classroomService.reorderPhotos(id, dto, currentUser)
  }
}