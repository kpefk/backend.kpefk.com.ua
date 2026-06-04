import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name)
  private readonly drive: drive_v3.Drive
  private readonly rootFolderId: string
  private readonly port: string

  public constructor(private readonly configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.getOrThrow<string>('GOOGLE_DRIVE_CLIENT_EMAIL'),
        private_key: this.configService
          .getOrThrow<string>('GOOGLE_DRIVE_PRIVATE_KEY')
          .replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    this.drive = google.drive({ version: 'v3', auth })
    this.rootFolderId = this.configService.getOrThrow<string>('GOOGLE_DRIVE_FOLDER_ID')
    this.port = this.configService.getOrThrow<string>('APPLICATION_PORT')
  }

  // ── Folders ─────────────────────────────────────────────────────

  /**
   * Returns ID of an existing subfolder by name, or creates it.
   */
  public async getOrCreateFolder(name: string, parentId: string): Promise<string> {
    try {
      const existing = await this.drive.files.list({
        q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        fields: 'files(id)',
      })

      const existingId = existing.data.files?.[0]?.id
      if (existingId) return existingId

      const created = await this.drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id',
      })

      if (!created.data.id) throw new Error('Folder ID not returned')
      return created.data.id
    } catch (error) {
      this.logger.error(`Failed to get/create folder "${name}"`, error)
      throw new InternalServerErrorException('Failed to create Google Drive folder.')
    }
  }

  /**
   * Returns the subfolder ID for a classroom, creating it if needed.
   * Structure: rootFolder / {classroomNumber}
   */
  public async getClassroomFolder(classroomNumber: string): Promise<string> {
    return this.getOrCreateFolder(classroomNumber, this.rootFolderId)
  }

  // ── Upload ───────────────────────────────────────────────────────

  /**
   * Uploads an image to the classroom subfolder.
   * Returns a proxied URL through our backend.
   */
  public async uploadPhoto(
    file: Express.Multer.File,
    classroomNumber: string,
  ): Promise<{ url: string; googleFileId: string }> {
    try {
      const folderId = await this.getClassroomFolder(classroomNumber)
      const stream = Readable.from(file.buffer)

      const response = await this.drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: `${Date.now()}-${file.originalname}`,
          parents: [folderId],
        },
        media: { mimeType: file.mimetype, body: stream },
        fields: 'id',
      })

      const googleFileId = response.data.id
      if (!googleFileId) throw new Error('File ID not returned')

      await this.drive.permissions.create({
        fileId: googleFileId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' },
      })

      const url = `http://localhost:${this.port}/classrooms/photos/${googleFileId}`
      return { url, googleFileId }
    } catch (error) {
      this.logger.error('Photo upload failed', error)
      throw new InternalServerErrorException('Failed to upload photo to Google Drive.')
    }
  }

  /**
   * Uploads a PDF passport to the classroom subfolder.
   * Returns a proxied URL through our backend.
   */
  public async uploadPassport(
    file: Express.Multer.File,
    classroomNumber: string,
  ): Promise<{ url: string; googleFileId: string }> {
    try {
      const folderId = await this.getClassroomFolder(classroomNumber)
      const stream = Readable.from(file.buffer)

      const response = await this.drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: `passport-${classroomNumber}-${Date.now()}.pdf`,
          parents: [folderId],
        },
        media: { mimeType: 'application/pdf', body: stream },
        fields: 'id',
      })

      const googleFileId = response.data.id
      if (!googleFileId) throw new Error('File ID not returned')

      await this.drive.permissions.create({
        fileId: googleFileId,
        supportsAllDrives: true,
        requestBody: { role: 'reader', type: 'anyone' },
      })

      const url = `http://localhost:${this.port}/classrooms/passport/${googleFileId}`
      return { url, googleFileId }
    } catch (error) {
      this.logger.error('Passport upload failed', error)
      throw new InternalServerErrorException('Failed to upload passport to Google Drive.')
    }
  }

  // ── Delete ───────────────────────────────────────────────────────

  public async deleteFile(googleFileId: string): Promise<void> {
    try {
      // Спочатку переміщуємо у кошик (працює з роллю Contributor на Shared Drive)
      await this.drive.files.update({
        fileId: googleFileId,
        supportsAllDrives: true,
        requestBody: { trashed: true },
      })

      // Потім видаляємо назавжди (потребує ролі Manager; якщо немає — файл
      // залишиться у кошику і буде автоматично видалений через 30 днів)
      await this.drive.files.delete({
        fileId: googleFileId,
        supportsAllDrives: true,
      })
    } catch (error: unknown) {
      const err = error as { code?: number; status?: number; message?: string }
      if (err?.code === 404 || err?.status === 404) return
      this.logger.error(`Delete failed for ${googleFileId}: ${err?.message ?? String(error)}`)
      throw new InternalServerErrorException('Failed to delete file from Google Drive.')
    }
  }

  // ── Stream (proxy) ───────────────────────────────────────────────

  public async streamFile(
    googleFileId: string,
  ): Promise<{ stream: NodeJS.ReadableStream; mimeType: string }> {
    try {
      const meta = await this.drive.files.get({
        fileId: googleFileId,
        supportsAllDrives: true,
        fields: 'mimeType',
      })

      const mimeType = meta.data.mimeType ?? 'application/octet-stream'

      const response = await this.drive.files.get(
        { fileId: googleFileId, supportsAllDrives: true, alt: 'media' },
        { responseType: 'stream' },
      )

      return { stream: response.data as unknown as NodeJS.ReadableStream, mimeType }
    } catch (error) {
      this.logger.error('Google Drive stream failed', error)
      throw new InternalServerErrorException('Failed to stream file from Google Drive.')
    }
  }

  // ── Metadata ─────────────────────────────────────────────────────

  public async getFileMetadata(googleFileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId: googleFileId,
        supportsAllDrives: true,
        fields: 'id, name, mimeType, size, createdTime',
      })
      return response.data
    } catch (error) {
      throw new InternalServerErrorException('Failed to get file metadata from Google Drive.')
    }
  }
}
