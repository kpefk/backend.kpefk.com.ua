import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common'
import { Prisma, UserRole } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { GoogleDriveService } from '@/libs/google-drive/google-drive.service'

import { CreateClassroomDto } from './dto/create-classroom.dto'
import { UpdateClassroomDto } from './dto/update-classroom.dto'
import { ReorderPhotosDto } from './dto/reorder-photos.dto'
import { ClassroomPhoto } from './types/classroom-photo.type'

const MAX_PHOTOS = 4

/**
 * Парсить JSON-поле з Prisma у типізований масив фото.
 * Prisma повертає Json як JsonValue, тому потрібен double cast через unknown.
 * @param raw - Сире значення з Prisma.
 * @returns Типізований масив ClassroomPhoto.
 */
function parsePhotos(raw: unknown): ClassroomPhoto[] {
  return (raw as ClassroomPhoto[]) ?? []
}

@Injectable()
export class ClassroomService {
  /**
   * Конструктор сервісу кабінетів.
   * @param prismaService - Сервіс для роботи з базою даних Prisma.
   * @param googleDriveService - Сервіс для роботи з Google Drive.
   */
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  // ─── Допоміжні методи ────────────────────────────────────────────────────────

  /**
   * Знаходить кабінет за ID.
   * Використовується внутрішньо перед будь-якою операцією з кабінетом.
   * @param id - ID кабінету.
   * @returns Знайдений кабінет.
   * @throws NotFoundException якщо кабінет не знайдено.
   */
  public async findById(id: string) {
    const classroom = await this.prismaService.classroom.findUnique({
      where: { id },
      include: { teacher: true }
    })

    if (!classroom) {
      throw new NotFoundException(
        'Кабінет не знайдено. Будь ласка, перевірте введені дані.'
      )
    }

    return classroom
  }

  /**
   * Перевіряє чи має поточний користувач право на редагування кабінету.
   * Адміністратор має доступ до будь-якого кабінету.
   * Викладач має доступ тільки до кабінету, завідувачем якого він є.
   * @param classroomId - ID кабінету.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Знайдений кабінет (щоб не робити повторний запит до БД).
   * @throws ForbiddenException якщо викладач не є завідувачем цього кабінету.
   */
  private async checkEditAccess(
    classroomId: string,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.findById(classroomId)

    if (currentUser.role === UserRole.ADMINISTRATOR) {
      return classroom
    }

    const teacher = await this.prismaService.teacher.findUnique({
      where: { userId: currentUser.id }
    })

    if (!teacher || classroom.teacherId !== teacher.id) {
      throw new ForbiddenException(
        'Ви не маєте доступу до редагування цього кабінету.'
      )
    }

    return classroom
  }

  // ─── Основні CRUD операції ───────────────────────────────────────────────────

  /**
   * Повертає список усіх кабінетів, відсортованих за номером.
   * @returns Список кабінетів із інформацією про завідувача.
   */
  public async findAll() {
    return this.prismaService.classroom.findMany({
      orderBy: { number: 'asc' },
      include: { teacher: true }
    })
  }

  /**
   * Створює новий кабінет (доступно тільки адміністратору).
   * Список фото ініціалізується як порожній масив.
   * @param dto - Дані для створення кабінету.
   * @returns Створений кабінет.
   */
  public async create(dto: CreateClassroomDto) {
    return this.prismaService.classroom.create({
      data: {
        number: dto.number,
        name: dto.name,
        ...(dto.teacherId && { teacherId: dto.teacherId }),
        photos: []
      }
    })
  }

  /**
   * Оновлює основну інформацію кабінету.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param dto - Дані для оновлення кабінету.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет.
   */
  public async update(
    id: string,
    dto: UpdateClassroomDto,
    currentUser: { id: string; role: UserRole }
  ) {
    await this.checkEditAccess(id, currentUser)

    return this.prismaService.classroom.update({
      where: { id },
      data: {
        ...(dto.number && { number: dto.number }),
        ...(dto.name && { name: dto.name }),
        ...(dto.teacherId !== undefined && { teacherId: dto.teacherId })
      }
    })
  }

  /**
   * Видаляє кабінет разом із усіма його фото на Google Drive.
   * Доступно тільки адміністратору.
   * @param id - ID кабінету.
   * @returns Видалений кабінет.
   */
  public async delete(id: string) {
    const classroom = await this.findById(id)
    const photos = parsePhotos(classroom.photos)

    // Видаляємо всі фото з Google Drive паралельно
    await Promise.all(
      photos.map(photo => this.googleDriveService.deleteFile(photo.googleFileId))
    )

    return this.prismaService.classroom.delete({ where: { id } })
  }

  // ─── Операції з фотографіями ─────────────────────────────────────────────────

  /**
   * Завантажує нове фото кабінету на Google Drive та додає його до списку.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param file - Файл фото (multipart/form-data, поле "file").
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет із новим фото.
   * @throws BadRequestException якщо вже досягнуто ліміт у 4 фото.
   */
  public async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)
    const photos = parsePhotos(classroom.photos)

    if (photos.length >= MAX_PHOTOS) {
      throw new BadRequestException(
        `Максимальна кількість фото — ${MAX_PHOTOS}.`
      )
    }

    const { url, googleFileId } = await this.googleDriveService.uploadFile(file)

    const updatedPhotos: ClassroomPhoto[] = [
      ...photos,
      { url, googleFileId, order: photos.length }
    ]

    return this.prismaService.classroom.update({
      where: { id },
      data: { photos: updatedPhotos as unknown as Prisma.InputJsonValue }
    })
  }

  /**
   * Видаляє фото кабінету з Google Drive та зі списку фото.
   * Після видалення перераховує порядок (order) фото що залишились.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param googleFileId - ID файлу на Google Drive.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет без видаленого фото.
   * @throws NotFoundException якщо фото з таким googleFileId не знайдено.
   */
  public async deletePhoto(
    id: string,
    googleFileId: string,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)
    const photos = parsePhotos(classroom.photos)

    const exists = photos.find(p => p.googleFileId === googleFileId)
    if (!exists) {
      throw new NotFoundException('Фото не знайдено.')
    }

    await this.googleDriveService.deleteFile(googleFileId)

    // Видаляємо фото і перераховуємо order для фото що залишились
    const updatedPhotos: ClassroomPhoto[] = photos
      .filter(p => p.googleFileId !== googleFileId)
      .map((p, index) => ({ ...p, order: index }))

    return this.prismaService.classroom.update({
      where: { id },
      data: { photos: updatedPhotos as unknown as Prisma.InputJsonValue }
    })
  }

  /**
   * Змінює порядок фото кабінету після Drag & Drop на фронті.
   * Фронт надсилає масив { googleFileId, order }[] із новим порядком.
   * Доступно адміністратору або викладачу, який є завідувачем цього кабінету.
   * @param id - ID кабінету.
   * @param dto - Масив об'єктів із googleFileId та новим order для кожного фото.
   * @param currentUser - Поточний авторизований користувач.
   * @returns Оновлений кабінет із новим порядком фото.
   */
  public async reorderPhotos(
    id: string,
    dto: ReorderPhotosDto,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)
    const photos = parsePhotos(classroom.photos)

    // Застосовуємо новий order до існуючих фото і сортуємо
    const updatedPhotos: ClassroomPhoto[] = photos
      .map(photo => {
        const reordered = dto.photos.find(
          p => p.googleFileId === photo.googleFileId
        )
        return reordered ? { ...photo, order: reordered.order } : photo
      })
      .sort((a, b) => a.order - b.order)

    return this.prismaService.classroom.update({
      where: { id },
      data: { photos: updatedPhotos as unknown as Prisma.InputJsonValue }
    })
  }
}