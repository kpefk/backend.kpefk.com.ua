import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Student, UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { ProvisionResult } from '@/libs/google-workspace/google-workspace.service'

import { BulkProvisionResult, StudentService } from './student.service'

@ApiTags('Студенти')
@ApiBearerAuth('access-token')
@Controller('students')
// Список студентів містить ПДн (РНОКПП, паспорт) — доступ лише адмінському рівню.
@Authorization(
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
)
export class StudentController {
  public constructor(private readonly studentService: StudentService) {}

  @ApiOperation({ summary: 'Отримати список студентів' })
  @ApiResponse({ status: 200, description: 'Список студентів' })
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public async findAll(): Promise<Student[]> {
    return this.studentService.findAll()
  }

  @ApiOperation({ summary: 'Отримати студента за ID' })
  @ApiParam({ name: 'id', description: 'UUID студента' })
  @ApiResponse({ status: 200, description: 'Знайдений студент' })
  @ApiResponse({ status: 404, description: 'Студента не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public async findById(@Param('id') id: string): Promise<Student> {
    return this.studentService.findById(id)
  }

  @ApiOperation({ summary: 'Переглянути згенерований email без створення акаунту' })
  @ApiParam({ name: 'id', description: 'UUID студента' })
  @ApiResponse({ status: 200, schema: { example: { email: 'kovalenko.i1503.d1.25@kpefk.com.ua' } } })
  @ApiResponse({ status: 404, description: 'Студента не знайдено' })
  @Get(':id/email-preview')
  @HttpCode(HttpStatus.OK)
  public async previewEmail(@Param('id') id: string): Promise<{ email: string }> {
    return this.studentService.previewEmail(id)
  }

  @ApiOperation({ summary: 'Створити корпоративний акаунт Google Workspace для студента' })
  @ApiParam({ name: 'id', description: 'UUID студента' })
  @ApiResponse({ status: 200, description: 'Акаунт створено або вже існував', schema: { example: { email: 'kovalenko.i1503.d1.25@kpefk.com.ua', created: true } } })
  @ApiResponse({ status: 404, description: 'Студента не знайдено' })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post(':id/provision-email')
  @HttpCode(HttpStatus.OK)
  public async provisionEmail(@Param('id') id: string): Promise<ProvisionResult> {
    return this.studentService.provisionEmail(id)
  }

  @ApiOperation({ summary: 'Масово створити акаунти для всіх студентів без корпоративної пошти' })
  @ApiResponse({ status: 200, description: 'Результат масового provisioning', schema: { example: { provisioned: 45, skipped: 3, failed: 0, total: 48 } } })
  @Authorization(UserRole.ADMINISTRATOR)
  @Post('provision-all-emails')
  @HttpCode(HttpStatus.OK)
  public async provisionAllEmails(): Promise<BulkProvisionResult> {
    return this.studentService.provisionAllEmails()
  }
}
