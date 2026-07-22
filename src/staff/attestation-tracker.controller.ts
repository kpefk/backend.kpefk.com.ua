import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { STAFF_MANAGE_ROLES } from './attestations.constants'
import { AttestationsService } from './attestations.service'
import { AttestationDueQueryDto } from './dto/attestation-due-query.dto'

@ApiTags('Атестація викладачів')
@ApiBearerAuth('access-token')
@Controller('attestations')
@Authorization(...STAFF_MANAGE_ROLES)
export class AttestationTrackerController {
	public constructor(private readonly service: AttestationsService) {}

	@ApiOperation({
		summary: 'Викладачі, що підлягають атестації (трекер термінів)'
	})
	@Get('due')
	@HttpCode(HttpStatus.OK)
	public getDue(@Query() query: AttestationDueQueryDto) {
		const year = query.year ?? new Date().getFullYear()
		return this.service.getDue(year)
	}
}
