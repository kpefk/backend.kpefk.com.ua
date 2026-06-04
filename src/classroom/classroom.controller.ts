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
  Res,
  UploadedFile,
  UseInterceptors
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UserRole } from '@prisma/client'
import { Response } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { GoogleDriveService } from '@/libs/google-drive/google-drive.service'

import { ClassroomService } from './classroom.service'
import { CreateClassroomDto } from './dto/create-classroom.dto'
import { UpdateClassroomDto } from './dto/update-classroom.dto'
import { ReorderPhotosDto } from './dto/reorder-photos.dto'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Controller for managing classrooms.
 */
@ApiTags('Навчальні кабінети')
@ApiBearerAuth('access-token')
@Controller('classrooms')
export class ClassroomController {
  /**
   * Constructor of the classroom controller.
   * @param classroomService - Service for working with classrooms.
   */
  public constructor(
    private readonly classroomService: ClassroomService,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  // ─── Basic CRUD operations ───────────────────────────────────────────────────

  /**
   * Returns a list of all classrooms.
   * Available to all authorized users.
   * @returns A list of classrooms with information about the head of the department.
   */
  @ApiOperation({ summary: 'Get all classrooms' })
  @ApiResponse({ status: 200, description: 'List of classrooms' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get()
  public async findAll() {
    return this.classroomService.findAll()
  }

  /**
   * Returns the classroom where the current user is the head (завідувач).
   * Returns null if not assigned to any classroom.
   */
  @ApiOperation({ summary: 'Отримати свій кабінет (для завідувача)' })
  @ApiResponse({ status: 200, description: 'Кабінет або null' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get('my')
  public async findMy(@Authorized('id') userId: string) {
    return this.classroomService.findMyClassroom(userId)
  }

  /**
   * Proxies a classroom photo from Google Drive.
   * Bypasses browser restrictions on embedding Shared Drive files.
   * Public — no auth required so <img> tags load without credentials.
   */
  @ApiOperation({ summary: 'Проксі фото кабінету з Google Drive' })
  @ApiParam({ name: 'googleFileId', description: 'ID файлу на Google Drive' })
  @ApiResponse({ status: 200, description: 'Зображення' })
  @ApiResponse({ status: 404, description: 'Файл не знайдено' })
  @Get('photos/:googleFileId')
  public async proxyPhoto(
    @Param('googleFileId') googleFileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, mimeType } = await this.googleDriveService.streamFile(googleFileId)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=86400') // кешуємо на 24год
    ;(stream as NodeJS.ReadableStream).pipe(res)
  }

  /**
   * Finds a classroom by ID.
   * Available to all authorized users.
   * @param id - The ID of the classroom.
   * @returns The found classroom with information about the head of the department.
   */
  @ApiOperation({ summary: 'Find classroom by ID' })
  @ApiResponse({ status: 200, description: 'Знайдений кабінет' })
  @ApiResponse({ status: 404, description: 'Кабінет не знайдено' })
  @Authorization()
  @HttpCode(HttpStatus.OK)
  @Get(':id')
  public async findById(@Param('id') id: string) {
    return this.classroomService.findById(id)
  }

  /**
   * Creates a new classroom.
   * Available only to administrators.
   * @param dto - Data for creating a classroom (number, name, ID of the head of the department).
   * @returns The created classroom.
   */
  @ApiOperation({ summary: 'Create a new classroom' })
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
   * Updates the main information of the classroom.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param dto - Data for updating (number, name, ID of the head of the department).
   * @param currentUser - The current authorized user.
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
   * Deletes the classroom along with all photos on Google Drive.
   * Available only to administrators.
   * @param id - The ID of the classroom.
   * @returns The deleted classroom.
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

  // ─── Operations with photos ─────────────────────────────────────────────────

  /**
   * Uploads a new photo of the classroom to Google Drive.
   * Available to the administrator or the teacher who is the head of the department.
   * Maximum number of photos — 4.
   * @param id - The ID of the classroom.
   * @param file - The photo file (multipart/form-data, field "file").
   * @param currentUser - The current authorized user.
   * @returns The updated classroom with the new photo.
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
   * Deletes a classroom photo from Google Drive.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param googleFileId - The file ID on Google Drive.
   * @param currentUser - The current authorized user.
   * @returns The updated classroom without the deleted photo.
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
   * Changes the order of classroom photos after Drag & Drop on the frontend.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param dto - An array of objects with googleFileId and the new order for each photo.
   * @param currentUser - The current authorized user.
   * @returns The updated classroom with the new photo order.
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

  // ─── Passport (PDF) ────────────────────────────────────────────────────────

  /**
   * Proxies a classroom passport PDF from Google Drive (public, no auth).
   */
  @ApiOperation({ summary: 'Проксі паспорту кабінету (PDF)' })
  @ApiParam({ name: 'googleFileId', description: 'ID файлу на Google Drive' })
  @Get('passport/:googleFileId')
  public async proxyPassport(
    @Param('googleFileId') googleFileId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { stream, mimeType } = await this.googleDriveService.streamFile(googleFileId)
    res.setHeader('Content-Type', mimeType)
    res.setHeader('Cache-Control', 'public, max-age=86400')
    ;(stream as NodeJS.ReadableStream).pipe(res)
  }

  /**
   * Uploads a PDF passport to the classroom subfolder on Google Drive.
   */
  @ApiOperation({ summary: 'Завантажити паспорт кабінету (PDF)' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/passport')
  @UseInterceptors(FileInterceptor('file'))
  public async uploadPassport(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 20 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /application\/pdf/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Authorized() currentUser: { id: string; role: UserRole },
  ) {
    return this.classroomService.uploadPassport(id, file, currentUser)
  }

  /**
   * Deletes the classroom passport PDF.
   */
  @ApiOperation({ summary: 'Видалити паспорт кабінету' })
  @Authorization(UserRole.ADMINISTRATOR, UserRole.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Delete(':id/passport')
  public async deletePassport(
    @Param('id') id: string,
    @Authorized() currentUser: { id: string; role: UserRole },
  ) {
    return this.classroomService.deletePassport(id, currentUser)
  }
}