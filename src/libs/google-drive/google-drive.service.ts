import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

@Injectable()
export class GoogleDriveService {
  private readonly drive: drive_v3.Drive
  private readonly folderId: string

  /**
   * Constructor of the Google Drive service.
   * Initializes the Google Drive client via Service Account.
   * @param configService - Service for getting environment variables.
   */
  public constructor(private readonly configService: ConfigService) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: this.configService.getOrThrow<string>(
          'GOOGLE_DRIVE_CLIENT_EMAIL'
        ),
        // Replaces the literal \n with a real newline (escaped from .env)
        private_key: this.configService
          .getOrThrow<string>('GOOGLE_DRIVE_PRIVATE_KEY')
          .replace(/\\n/g, '\n')
      },
      scopes: ['https://www.googleapis.com/auth/drive']
    })

    this.drive = google.drive({ version: 'v3', auth })
    this.folderId = this.configService.getOrThrow<string>(
      'GOOGLE_DRIVE_FOLDER_ID'
    )
  }

  /**
   * Uploads a file to Google Drive in the specified folder.
   * After upload, opens public access to the file.
   * @param file - File from Multer (buffer, mimetype, originalname).
   * @returns Object with public URL and file ID on Google Drive.
   * @throws InternalServerErrorException if upload failed.
   */
  public async uploadFile(
    file: Express.Multer.File
  ): Promise<{ url: string; googleFileId: string }> {
    try {
      // Converts Buffer to Readable Stream - Drive API requires stream
      const stream = Readable.from(file.buffer)

      const response = await this.drive.files.create({
        requestBody: {
          name: `${Date.now()}-${file.originalname}`,
          parents: [this.folderId]
        },
        media: {
          mimeType: file.mimetype,
          body: stream
        },
        // Returns only id in the response
        fields: 'id'
      })

      const googleFileId = response.data.id

      if (!googleFileId) {
        throw new Error('Google Drive does not return file ID.')
      }

      // Opens public access to the file (read for everyone)
      await this.drive.permissions.create({
        fileId: googleFileId,
        requestBody: {
          role: 'reader',
          type: 'anyone'
        }
      })

      // Generates a direct link for displaying the image
      const url = `https://drive.google.com/uc?export=view&id=${googleFileId}`

      return { url, googleFileId }
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to upload file to Google Drive. Please try again.'
      )
    }
  }

  /**
   * Deletes a file from Google Drive by its ID.
   * If the file no longer exists, the error is ignored (idempotent operation).
   * @param googleFileId - File ID on Google Drive.
   * @throws InternalServerErrorException if deletion failed for any other reason.
   */
  public async deleteFile(googleFileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId: googleFileId })
    } catch (error: any) {
      // 404 - file already deleted or does not exist, ignore
      if (error?.code === 404 || error?.status === 404) {
        return
      }

      throw new InternalServerErrorException(
        'Failed to delete file from Google Drive. Please try again.'
      )
    }
  }

  /**
   * Gets file metadata from Google Drive by its ID.
   * Can be used to check file existence.
   * @param googleFileId - File ID on Google Drive.
   * @returns File metadata (name, mimeType, size, etc.).
   * @throws InternalServerErrorException if the request failed.
   */
  public async getFileMetadata(googleFileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId: googleFileId,
        fields: 'id, name, mimeType, size, createdTime'
      })

      return response.data
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to get file metadata from Google Drive. Please try again.'
      )
    }
  }
}