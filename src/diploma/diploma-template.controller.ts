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
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'

import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import {
  DiplomaTemplateService,
  type TemplateFileKind,
} from './diploma-template.service'
import {
  CreateTemplateDto,
  SetTemplateComponentsDto,
  UpdateTemplateDto,
} from './dto/diploma.dto'

const DIPLOMA_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

@ApiTags('Дипломи — шаблони')
@ApiBearerAuth('access-token')
@Controller('diploma-templates')
@Authorization(...DIPLOMA_ROLES)
export class DiplomaTemplateController {
  public constructor(private readonly service: DiplomaTemplateService) {}

  @ApiOperation({ summary: 'Список шаблонів' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public list() {
    return this.service.list()
  }

  @ApiOperation({ summary: 'Шаблон + структура ОК' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public get(@Param('id') id: string) {
    return this.service.get(id)
  }

  @ApiOperation({ summary: 'Створити шаблон' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto)
  }

  @ApiOperation({ summary: 'Оновити шаблон' })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  public update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto)
  }

  @ApiOperation({ summary: 'Видалити шаблон' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  public remove(@Param('id') id: string) {
    return this.service.remove(id)
  }

  @ApiOperation({ summary: 'Замінити структуру ОК шаблону' })
  @Put(':id/components')
  @HttpCode(HttpStatus.OK)
  public setComponents(
    @Param('id') id: string,
    @Body() dto: SetTemplateComponentsDto,
  ) {
    return this.service.setComponents(id, dto)
  }

  @ApiOperation({ summary: 'Завантажити .docx шаблон (kind: diploma | addendum)' })
  @ApiConsumes('multipart/form-data')
  @Post(':id/files/:kind')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  public async uploadFile(
    @Param('id') id: string,
    @Param('kind') kind: TemplateFileKind,
    @UploadedFile() file: Express.Multer.File,
  ) {
    await this.service.uploadFile(id, kind === 'diploma' ? 'diploma' : 'addendum', file.buffer)
    return this.service.get(id)
  }
}
