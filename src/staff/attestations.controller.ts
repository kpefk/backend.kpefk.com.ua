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
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { STAFF_MANAGE_ROLES } from './attestations.constants'
import { AttestationsService } from './attestations.service'
import { CreateAttestationDto } from './dto/create-attestation.dto'
import { UpdateAttestationDto } from './dto/update-attestation.dto'

@ApiTags('Атестація викладачів')
@ApiBearerAuth('access-token')
@Controller('staff/:teacherId/attestations')
@Authorization(...STAFF_MANAGE_ROLES)
export class TeacherAttestationsController {
	public constructor(private readonly service: AttestationsService) {}

	@ApiOperation({ summary: 'Список атестацій викладача' })
	@ApiParam({ name: 'teacherId', description: 'ID викладача' })
	@Get()
	@HttpCode(HttpStatus.OK)
	public findAll(@Param('teacherId') teacherId: string) {
		return this.service.findAll(teacherId)
	}

	@ApiOperation({ summary: 'Додати запис атестації' })
	@ApiParam({ name: 'teacherId', description: 'ID викладача' })
	@Post()
	@HttpCode(HttpStatus.CREATED)
	public create(
		@Param('teacherId') teacherId: string,
		@Body() dto: CreateAttestationDto,
		@Authorized('id') userId: string
	) {
		return this.service.create(teacherId, dto, userId)
	}

	@ApiOperation({ summary: 'Оновити запис атестації' })
	@ApiParam({ name: 'teacherId', description: 'ID викладача' })
	@ApiParam({ name: 'id', description: 'ID запису' })
	@Patch(':id')
	@HttpCode(HttpStatus.OK)
	public update(
		@Param('teacherId') teacherId: string,
		@Param('id') id: string,
		@Body() dto: UpdateAttestationDto
	) {
		return this.service.update(teacherId, id, dto)
	}

	@ApiOperation({ summary: 'Видалити запис атестації' })
	@ApiParam({ name: 'teacherId', description: 'ID викладача' })
	@ApiParam({ name: 'id', description: 'ID запису' })
	@Delete(':id')
	@HttpCode(HttpStatus.OK)
	public remove(
		@Param('teacherId') teacherId: string,
		@Param('id') id: string
	) {
		return this.service.remove(teacherId, id)
	}
}
