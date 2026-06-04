import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
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
 * Parses the JSON field from Prisma into a typed array of photos.
 * Prisma returns Json as JsonValue, so a double cast through unknown is required.
 * @param raw - Raw value from Prisma.
 * @returns Typed array of ClassroomPhoto.
 */
function parsePhotos(raw: unknown): ClassroomPhoto[] {
  return (raw as ClassroomPhoto[]) ?? []
}

@Injectable()
export class ClassroomService {
  private readonly logger = new Logger(ClassroomService.name)

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly googleDriveService: GoogleDriveService
  ) {}

  // ─── Допоміжні методи ────────────────────────────────────────────────────────

  /**
   * Finds the classroom by ID.
   * Used internally before any operation with the classroom.
   * @param id - The ID of the classroom.
   * @returns The found classroom.
   * @throws NotFoundException if the classroom is not found.
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
   * Checks if the current user has the right to edit the classroom.
   * The administrator has access to any classroom.
   * The teacher has access only to the classroom of which he is the head.
   * @param classroomId - The ID of the classroom.
   * @param currentUser - The current authorized user.
   * @returns The found classroom (to avoid making a second request to the database).
   * @throws ForbiddenException if the teacher is not the head of this classroom.
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

  // ─── Main CRUD operations ───────────────────────────────────────────────────

  /**
   * Returns a list of all classrooms, sorted by number.
   * @returns A list of classrooms with information about the head of the department.
   */
  public async findAll() {
    return this.prismaService.classroom.findMany({
      orderBy: { number: 'asc' },
      include: { teacher: true }
    })
  }

  /**
   * Returns the classroom where the current user is the head (завідувач).
   * Returns null if the user is not assigned to any classroom.
   */
  public async findMyClassroom(userId: string) {
    const teacher = await this.prismaService.teacher.findUnique({
      where: { userId },
    })

    if (!teacher) return null

    return this.prismaService.classroom.findFirst({
      where: { teacherId: teacher.id },
      include: { teacher: true },
    })
  }

  /**
   * Creates a new classroom (available only to the administrator).
   * The list of photos is initialized as an empty array.
   * @param dto - Data for creating a classroom.
   * @returns The created classroom.
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
   * Updates the main information of the classroom.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param dto - Data for updating the classroom.
   * @param currentUser - The current authorized user.
   * @returns The updated classroom.
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
   * Deletes the classroom along with all its photos from Google Drive.
   * Available only to the administrator.
   * @param id - The ID of the classroom.
   * @returns The deleted classroom.
   */
  public async delete(id: string) {
    const classroom = await this.findById(id)
    const photos = parsePhotos(classroom.photos)

    // Збираємо всі файли для видалення: фото + паспорт
    const fileIds = [
      ...photos.map(p => p.googleFileId),
      ...(classroom.passportGoogleFileId ? [classroom.passportGoogleFileId] : []),
    ]

    await Promise.all(
      fileIds.map(fileId =>
        this.googleDriveService.deleteFile(fileId).catch(err => {
          this.logger.error(`Failed to delete Drive file ${fileId}:`, err)
        })
      )
    )

    return this.prismaService.classroom.delete({ where: { id } })
  }

  // ─── Photo operations ─────────────────────────────────────────────────────────

  /**
   * Uploads a new photo of the classroom to Google Drive and adds it to the list.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param file - The photo file (multipart/form-data, field "file").
   * @param currentUser - The current authorized user.
   * @returns The updated classroom with the new photo.
   * @throws BadRequestException if the limit of 4 photos has already been reached.
   */
  public async uploadPhoto(
    id: string,
    file: Express.Multer.File,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)
    const photos = parsePhotos(classroom.photos)

    if (photos.length >= MAX_PHOTOS) {
      throw new BadRequestException(`Максимальна кількість фото — ${MAX_PHOTOS}.`)
    }

    const { url, googleFileId } = await this.googleDriveService.uploadPhoto(file, classroom.number)

    const updatedPhotos: ClassroomPhoto[] = [
      ...photos,
      { url, googleFileId, order: photos.length },
    ]

    return this.prismaService.classroom.update({
      where: { id },
      data: { photos: updatedPhotos as unknown as Prisma.InputJsonValue },
    })
  }

  public async uploadPassport(
    id: string,
    file: Express.Multer.File,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)

    // Видаляємо старий паспорт якщо є
    if (classroom.passportGoogleFileId) {
      await this.googleDriveService.deleteFile(classroom.passportGoogleFileId).catch(err => {
        this.logger.error(`Failed to delete old passport ${classroom.passportGoogleFileId}:`, err)
      })
    }

    const { url, googleFileId } = await this.googleDriveService.uploadPassport(file, classroom.number)

    return this.prismaService.classroom.update({
      where: { id },
      data: { passportGoogleFileId: googleFileId, passportUrl: url },
    })
  }

  public async deletePassport(
    id: string,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)

    if (!classroom.passportGoogleFileId) {
      throw new BadRequestException('Паспорт кабінету відсутній.')
    }

    await this.googleDriveService.deleteFile(classroom.passportGoogleFileId)

    return this.prismaService.classroom.update({
      where: { id },
      data: { passportGoogleFileId: null, passportUrl: null },
    })
  }

  /**
   * Deletes a classroom photo from Google Drive and from the photo list.
   * After deletion, it recalculates the order of the remaining photos.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param googleFileId - The ID of the file on Google Drive.
   * @param currentUser - The current authorized user.
   * @returns The updated classroom without the deleted photo.
   * @throws NotFoundException if a photo with such googleFileId is not found.
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

    // Remove photo and recalculate order for remaining photos
    const updatedPhotos: ClassroomPhoto[] = photos
      .filter(p => p.googleFileId !== googleFileId)
      .map((p, index) => ({ ...p, order: index }))

    return this.prismaService.classroom.update({
      where: { id },
      data: { photos: updatedPhotos as unknown as Prisma.InputJsonValue }
    })
  }

  /**
   * Changes the order of classroom photos after Drag & Drop on the frontend.
   * The frontend sends an array of { googleFileId, order }[] with the new order.
   * Available to the administrator or the teacher who is the head of the department.
   * @param id - The ID of the classroom.
   * @param dto - Array of objects with googleFileId and new order for each photo.
   * @param currentUser - The current authorized user.
   * @returns The updated classroom with the new photo order.
   */
  public async reorderPhotos(
    id: string,
    dto: ReorderPhotosDto,
    currentUser: { id: string; role: UserRole }
  ) {
    const classroom = await this.checkEditAccess(id, currentUser)
    const photos = parsePhotos(classroom.photos)

    // Apply new order to existing photos and sort
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