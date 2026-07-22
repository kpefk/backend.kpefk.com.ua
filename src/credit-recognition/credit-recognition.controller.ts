import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Patch,
	Post
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { RECOGNITION_MANAGE_ROLES } from './credit-recognition.constants'
import { CreditRecognitionService } from './credit-recognition.service'
import {
	CreateCreditRecognitionDto,
	UpdateCreditRecognitionDto
} from './dto/credit-recognition-request.dto'

@ApiTags('Перезарахування кредитів')
@ApiBearerAuth('access-token')
@Controller('credit-recognitions')
@Authorization(...RECOGNITION_MANAGE_ROLES)
export class CreditRecognitionController {
	public constructor(private readonly service: CreditRecognitionService) {}

	@ApiOperation({ summary: 'Список актів перезарахування' })
	@Get()
	@HttpCode(HttpStatus.OK)
	public list() {
		return this.service.list()
	}

	@ApiOperation({ summary: 'Акти перезарахування студента' })
	@Get('students/:studentId')
	@HttpCode(HttpStatus.OK)
	public listByStudent(@Param('studentId') studentId: string) {
		return this.service.listByStudent(studentId)
	}

	@ApiOperation({ summary: 'Деталі акту' })
	@Get(':id')
	@HttpCode(HttpStatus.OK)
	public get(@Param('id') id: string) {
		return this.service.get(id)
	}

	@ApiOperation({ summary: 'Створити акт (DRAFT)' })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	public create(
		@Body() dto: CreateCreditRecognitionDto,
		@Authorized('id') userId: string
	) {
		return this.service.create(dto, userId)
	}

	@ApiOperation({ summary: 'Оновити акт (лише DRAFT)' })
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	public update(
		@Param('id') id: string,
		@Body() dto: UpdateCreditRecognitionDto
	) {
		return this.service.update(id, dto)
	}

	@ApiOperation({
		summary: 'Підтвердити — згенерувати перезараховані оцінки'
	})
	@Post(':id/confirm')
	@HttpCode(HttpStatus.OK)
	public confirm(@Param('id') id: string, @Authorized('id') userId: string) {
		return this.service.confirm(id, userId)
	}

	@ApiOperation({
		summary: 'Повернути в чернетку (лише адміністратор) — прибрати оцінки'
	})
	@Authorization(UserRole.ADMINISTRATOR)
	@Post(':id/revert')
	@HttpCode(HttpStatus.OK)
	public revert(@Param('id') id: string) {
		return this.service.revert(id)
	}

	@ApiOperation({ summary: 'Видалити акт (лише DRAFT)' })
	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	public async remove(@Param('id') id: string) {
		await this.service.remove(id)
		return { ok: true }
	}
}
