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
	Put
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import {
	CreateSurveyDto,
	SetSurveyQuestionsDto,
	SetSurveyStatusDto,
	SubmitSurveyDto,
	UpdateSurveyDto
} from './dto/survey-request.dto'
import { SURVEY_MANAGE_ROLES } from './surveys.constants'
import { SurveysService } from './surveys.service'

@ApiTags('Опитування здобувачів')
@ApiBearerAuth('access-token')
@Controller('surveys')
@Authorization(...SURVEY_MANAGE_ROLES)
export class SurveysController {
	public constructor(private readonly service: SurveysService) {}

	// ── Student self-service (route-level ролі перекривають class-level) ────────

	@ApiOperation({ summary: 'Доступні опитування для студента (з питаннями)' })
	@Authorization(UserRole.STUDENT)
	@Get('my')
	@HttpCode(HttpStatus.OK)
	public listMy(@Authorized('id') userId: string) {
		return this.service.listMy(userId)
	}

	@ApiOperation({
		summary: 'Пройти опитування (один раз; анонімно, якщо задано кампанією)'
	})
	@Authorization(UserRole.STUDENT)
	@Post(':id/submit')
	@HttpCode(HttpStatus.OK)
	public async submit(
		@Param('id') id: string,
		@Body() dto: SubmitSurveyDto,
		@Authorized('id') userId: string
	) {
		await this.service.submit(id, dto, userId)
		return { ok: true }
	}

	// ── Admin ──────────────────────────────────────────────────────────────────

	@ApiOperation({ summary: 'Список кампаній опитувань' })
	@Get()
	@HttpCode(HttpStatus.OK)
	public list() {
		return this.service.list()
	}

	@ApiOperation({ summary: 'Створити кампанію (DRAFT)' })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	public create(
		@Body() dto: CreateSurveyDto,
		@Authorized('id') userId: string
	) {
		return this.service.create(dto, userId)
	}

	@ApiOperation({ summary: 'Деталі кампанії' })
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	public get(@Param('id') id: string) {
		return this.service.get(id)
	}

	@ApiOperation({ summary: 'Оновити кампанію (лише DRAFT)' })
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	public update(@Param('id') id: string, @Body() dto: UpdateSurveyDto) {
		return this.service.update(id, dto)
	}

	@ApiOperation({ summary: 'Замінити набір питань (лише DRAFT)' })
	@Put(':id/questions')
	@HttpCode(HttpStatus.OK)
	public setQuestions(
		@Param('id') id: string,
		@Body() dto: SetSurveyQuestionsDto
	) {
		return this.service.setQuestions(id, dto)
	}

	@ApiOperation({
		summary:
			'Змінити статус: DRAFT→OPEN, OPEN→CLOSED; повернення в DRAFT — лише адміністратор'
	})
	@Patch(':id/status')
	@HttpCode(HttpStatus.OK)
	public setStatus(
		@Param('id') id: string,
		@Body() dto: SetSurveyStatusDto,
		@Authorized('role') role: UserRole
	) {
		return this.service.setStatus(id, dto.status, role)
	}

	@ApiOperation({ summary: 'Видалити кампанію (лише DRAFT)' })
	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	public async remove(@Param('id') id: string) {
		await this.service.remove(id)
		return { ok: true }
	}

	@ApiOperation({
		summary: 'Результати: агрегати по питаннях + response rate'
	})
	@Get(':id/results')
	@HttpCode(HttpStatus.OK)
	public getResults(@Param('id') id: string) {
		return this.service.getResults(id)
	}
}
