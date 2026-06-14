import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CurriculumImportService } from './curriculum-import.service'
import { ImportCommitDto } from './dto/import-commit.dto'

const IMPORT_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

@ApiTags('Навчальний план — Імпорт з Excel')
@ApiBearerAuth('access-token')
@Controller('curricula/import')
@Authorization(...IMPORT_ROLES)
export class CurriculumImportController {
  public constructor(private readonly service: CurriculumImportService) {}

  @ApiOperation({ summary: 'Предперегляд: парсинг .xls без запису в БД' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Розпарсена структура плану' })
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public preview(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.service.preview(file)
  }

  @ApiOperation({ summary: 'Фіксація: запис розпарсеного плану в БД (нова чернеткова версія)' })
  @ApiResponse({ status: 201, description: 'Створено версію навчального плану' })
  @ApiResponse({ status: 404, description: 'ОПП не знайдено' })
  @Post('commit')
  @HttpCode(HttpStatus.CREATED)
  public commit(@Body() dto: ImportCommitDto) {
    return this.service.commit(dto)
  }
}
