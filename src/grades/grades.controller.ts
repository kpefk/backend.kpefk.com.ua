import {
	Body,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post,
	Query,
	Res
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import type { Response } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import {
	BulkGradeEntryDto,
	CreateSemesterGradeDto
} from './dto/create-semester-grade.dto'
import {
	GradesByComponentTermQueryDto,
	GradesByStudentQueryDto,
	MyDisciplinesQueryDto,
	RetakeHistoryQueryDto
} from './dto/grade-query.dto'
import { UpdateGradeWeightSettingsDto } from './dto/grade-weight-settings.dto'
import { GradeWeightSettingsService } from './grade-weight-settings.service'
import { GRADES_ROLES, isElevatedGrades } from './grades.constants'
import { type GradesActor, GradesService } from './grades.service'
import { VidomistService } from './vidomist.service'

const DOCX_MIME =
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

@ApiTags('Оцінки')
@ApiBearerAuth('access-token')
@Controller('grades')
@Authorization(...GRADES_ROLES)
export class GradesController {
	public constructor(
		private readonly gradesService: GradesService,
		private readonly vidomistService: VidomistService,
		private readonly weightSettingsService: GradeWeightSettingsService
	) {}

	@ApiOperation({ summary: 'Виставити семестрову оцінку' })
	@Post()
	@HttpCode(HttpStatus.OK)
	public recordGrade(
		@Body() dto: CreateSemesterGradeDto,
		@Authorized('id') userId: string,
		@Authorized('role') role: UserRole
	) {
		return this.gradesService.recordGrade(dto, this.actor(userId, role))
	}

	@ApiOperation({ summary: 'Масове виставлення оцінок для групи' })
	@Post('bulk')
	@HttpCode(HttpStatus.OK)
	public recordGradesBulk(
		@Body() dto: BulkGradeEntryDto,
		@Authorized('id') userId: string,
		@Authorized('role') role: UserRole
	) {
		return this.gradesService.recordGradesBulk(
			dto,
			this.actor(userId, role)
		)
	}

	@ApiOperation({ summary: 'Відомість оцінок по дисципліні' })
	@Get('by-component-term/:id')
	@HttpCode(HttpStatus.OK)
	public getGradeSheet(
		@Param('id') componentTermId: string,
		@Query() query: GradesByComponentTermQueryDto
	) {
		return this.gradesService.getGradeSheet(componentTermId, query)
	}

	@ApiOperation({
		summary: 'Залікова книжка студента (студент — лише власну)'
	})
	// Route-level ролі перекривають class-level (getAllAndOverride): відкриваємо STUDENT
	// саме тут; ownership (IDOR-захист) перевіряється в сервісі.
	@Authorization(...GRADES_ROLES, UserRole.STUDENT)
	@Get('by-student/:id')
	@HttpCode(HttpStatus.OK)
	public getStudentTranscript(
		@Param('id') studentId: string,
		@Query() query: GradesByStudentQueryDto,
		@Authorized('id') userId: string,
		@Authorized('role') role: UserRole
	) {
		return this.gradesService.getStudentTranscript(
			studentId,
			query,
			this.actor(userId, role)
		)
	}

	@ApiOperation({ summary: 'Історія перездач (студент — лише власні)' })
	@Authorization(...GRADES_ROLES, UserRole.STUDENT)
	@Get('retake-history')
	@HttpCode(HttpStatus.OK)
	public getRetakeHistory(
		@Query() query: RetakeHistoryQueryDto,
		@Authorized('id') userId: string,
		@Authorized('role') role: UserRole
	) {
		return this.gradesService.getRetakeHistory(
			query.studentId,
			query.componentTermId,
			this.actor(userId, role)
		)
	}

	@ApiOperation({
		summary: 'Мої дисципліни для оцінювання (тільки для TEACHER)'
	})
	@Get('my-disciplines')
	@HttpCode(HttpStatus.OK)
	@Authorization(UserRole.TEACHER)
	public getMyDisciplines(
		@Query() query: MyDisciplinesQueryDto,
		@Authorized('id') userId: string
	) {
		return this.gradesService.getMyDisciplines(userId, query.academicYear)
	}

	@ApiOperation({ summary: 'Шкала оцінювання для дисципліни' })
	@Get('scale/:componentTermId')
	@HttpCode(HttpStatus.OK)
	public getScaleInfo(@Param('componentTermId') componentTermId: string) {
		return this.gradesService.getScaleInfo(componentTermId)
	}

	@ApiOperation({
		summary: 'Вагова схема формули підказки підсумкової оцінки'
	})
	@Get('weight-settings')
	@HttpCode(HttpStatus.OK)
	public getWeightSettings() {
		return this.weightSettingsService.get()
	}

	@ApiOperation({ summary: 'Оновити вагову схему (лише керівництво)' })
	@Patch('weight-settings')
	@HttpCode(HttpStatus.OK)
	public updateWeightSettings(
		@Body() dto: UpdateGradeWeightSettingsDto,
		@Authorized('role') role: UserRole
	) {
		if (!isElevatedGrades(role)) {
			throw new ForbiddenException(
				'Недостатньо прав для зміни вагової схеми'
			)
		}
		return this.weightSettingsService.update(dto)
	}

	@ApiOperation({ summary: 'Згенерувати відомість (.docx)' })
	@ApiQuery({ name: 'groupId', required: true })
	@ApiQuery({ name: 'academicYear', required: true })
	@ApiResponse({ status: 200, description: '.docx файл відомості' })
	@Get('vidomist/:componentTermId')
	public async generateVidomist(
		@Param('componentTermId') componentTermId: string,
		@Query('groupId') groupId: string,
		@Query('academicYear') academicYear: string,
		@Res() res: Response
	) {
		const { buffer, filename } = await this.vidomistService.generate(
			componentTermId,
			groupId,
			academicYear
		)
		const asciiName = filename.replace(/[^\x20-\x7E]/g, '_')
		res.set({
			'Content-Type': DOCX_MIME,
			'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
			'Content-Length': String(buffer.length)
		})
		res.end(buffer)
	}

	private actor(userId: string, role: UserRole): GradesActor {
		return { userId, role }
	}
}
