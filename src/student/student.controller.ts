import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { Student } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { StudentService } from './student.service'

@ApiTags('Студенти')
@ApiBearerAuth('access-token')
@Controller('students')
@Authorization()
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
  @ApiResponse({ status: 401, description: 'Не авторизований' })
  @ApiResponse({ status: 404, description: 'Студента не знайдено' })
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  public async findById(@Param('id') id: string): Promise<Student> {
    return this.studentService.findById(id)
  }
}
