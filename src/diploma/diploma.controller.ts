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
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import type { Response } from 'express'

import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'
import { EdboService } from '@/edbo/core/edbo.service'

import { DiplomaEdboService } from './diploma-edbo.service'
import { DiplomaGeneratorService, type DiplomaDocKind } from './diploma-generator.service'
import { DiplomaImportService } from './diploma-import.service'
import { DiplomaService } from './diploma.service'
import {
  ApplyBatchTemplateDto,
  AssignTemplateDto,
  ImportCommitDto,
  SetGradesDto,
  UpdateDiplomaDto,
} from './dto/diploma.dto'

const DIPLOMA_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

function sendFile(res: Response, buffer: Buffer, filename: string, mime: string): void {
  const asciiName = filename.replace(/[^\x20-\x7E]/g, '_')
  res.set({
    'Content-Type': mime,
    'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    'Content-Length': String(buffer.length),
  })
  res.end(buffer)
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

@ApiTags('Дипломи')
@ApiBearerAuth('access-token')
@Controller('diplomas')
@Authorization(...DIPLOMA_ROLES)
export class DiplomaController {
  public constructor(
    private readonly importService: DiplomaImportService,
    private readonly diplomaService: DiplomaService,
    private readonly generatorService: DiplomaGeneratorService,
    private readonly edboService: EdboService,
    private readonly edboEntryService: DiplomaEdboService,
  ) {}

  // ── Import ─────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Предперегляд XML ЄДЕБО (без запису)' })
  @ApiConsumes('multipart/form-data')
  @Post('import/preview')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public preview(@UploadedFile() file: Express.Multer.File) {
    return this.importService.preview(file)
  }

  @ApiOperation({ summary: 'Імпорт XML ЄДЕБО: створення партії + дипломів' })
  @ApiConsumes('multipart/form-data')
  @Post('import/commit')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  public commit(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: ImportCommitDto,
    @Authorized('id') userId: string,
  ) {
    return this.importService.commit(file, dto, userId)
  }

  // ── Batches ────────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Список партій імпорту' })
  @Get('batches')
  @HttpCode(HttpStatus.OK)
  public listBatches() {
    return this.diplomaService.listBatches()
  }

  @ApiOperation({ summary: 'Призначити шаблон усім дипломам партії та застосувати знімок компонентів' })
  @Post('batches/:id/template')
  @HttpCode(HttpStatus.OK)
  public applyTemplateToBatch(
    @Param('id') id: string,
    @Body() dto: ApplyBatchTemplateDto,
  ) {
    return this.diplomaService.applyTemplateToBatch(id, dto.templateId ?? null, dto.groupName)
  }

  @ApiOperation({ summary: "Видалити партію дипломів (і всі пов'язані дипломи)" })
  @Delete('batches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  public async deleteBatch(@Param('id') id: string) {
    await this.diplomaService.deleteBatch(id)
  }

  @ApiOperation({ summary: 'Підтягнути з ЄДЕБО документи про освіту (підстава для вступу) для партії' })
  @Post('batches/:id/sync-entry-documents')
  @HttpCode(HttpStatus.OK)
  public syncEntryDocuments(@Param('id') id: string) {
    return this.edboEntryService.syncEntryDocuments(id)
  }

  // ── Grade sheet ────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Зведена відомість партії: всі студенти × ОК + оцінки' })
  @ApiQuery({ name: 'batchId', required: true })
  @Get('grade-sheet')
  @HttpCode(HttpStatus.OK)
  public getGradeSheet(@Query('batchId') batchId: string) {
    return this.diplomaService.getGradeSheet(batchId)
  }

  // ── ЄДЕБО accreditation lookup ─────────────────────────────────────────────

  @ApiOperation({ summary: 'Акредитація ЄДЕБО для спеціальності (пошук за кодом/назвою)' })
  @ApiQuery({ name: 'search', required: false })
  @Get('edbo/accreditation')
  @HttpCode(HttpStatus.OK)
  public async getEdboAccreditation(@Query('search') search?: string) {
    const universityId = Number(process.env.EDBO_CODE ?? '0')
    const result = await this.edboService.post<unknown[]>(
      '/api/accreditationSpecialities/list',
      { UniversityId: universityId, SearchStr: search ?? '', pageSize: 100 },
    )
    return Array.isArray(result) ? result : []
  }

  // ── Diplomas ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Список дипломів (опційно по партії)' })
  @ApiQuery({ name: 'batchId', required: false })
  @Get()
  @HttpCode(HttpStatus.OK)
  public listDiplomas(@Query('batchId') batchId?: string) {
    return this.diplomaService.listDiplomas(batchId)
  }

  // ── Generate ───────────────────────────────────────────────────────────────

  @ApiOperation({ summary: 'Згенерувати всі дипломи/додатки партії (zip)' })
  @ApiQuery({ name: 'batchId', required: true })
  @ApiQuery({ name: 'doc', required: true, enum: ['diploma', 'addendum'] })
  @Post('generate-bulk')
  public async generateBulk(
    @Query('batchId') batchId: string,
    @Query('doc') doc: DiplomaDocKind,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.generatorService.generateBulk(batchId, doc)
    sendFile(res, buffer, filename, 'application/zip')
  }

  @ApiOperation({ summary: 'Один диплом (повна картка зі зведеною відомістю)' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public getDiploma(@Param('id') id: string) {
    return this.diplomaService.getDiploma(id)
  }

  @ApiOperation({ summary: 'Оновити диплом (шаблон, тема роботи, відзнака, статус)' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  public update(@Param('id') id: string, @Body() dto: UpdateDiplomaDto) {
    return this.diplomaService.update(id, dto)
  }

  @ApiOperation({ summary: 'Призначити шаблон (опційно на всю групу)' })
  @Post(':id/template')
  @HttpCode(HttpStatus.OK)
  public assignTemplate(@Param('id') id: string, @Body() dto: AssignTemplateDto) {
    return this.diplomaService.assignTemplate(id, dto.templateId, dto.applyToGroup ?? false)
  }

  @ApiOperation({ summary: 'Виставити оцінки зведеної відомості' })
  @Patch(':id/grades')
  @HttpCode(HttpStatus.OK)
  public setGrades(@Param('id') id: string, @Body() dto: SetGradesDto) {
    return this.diplomaService.setGrades(id, dto)
  }

  @ApiOperation({ summary: 'Згенерувати .docx диплома або додатка' })
  @ApiQuery({ name: 'doc', required: true, enum: ['diploma', 'addendum'] })
  @ApiResponse({ status: 200, description: '.docx файл' })
  @Get(':id/generate')
  public async generate(
    @Param('id') id: string,
    @Query('doc') doc: DiplomaDocKind,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.generatorService.generateOne(id, doc)
    sendFile(res, buffer, filename, DOCX_MIME)
  }
}
