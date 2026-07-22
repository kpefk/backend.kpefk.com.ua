import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	Put,
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
import type { Response } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { GroupRatingQueryDto, SetRatingBonusDto } from './dto/rating.dto'
import { RATING_MANAGE_ROLES } from './rating.constants'
import { RatingService } from './rating.service'

const XLSX_MIME =
	'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

@ApiTags('Рейтинг успішності')
@ApiBearerAuth('access-token')
@Controller('rating')
@Authorization(...RATING_MANAGE_ROLES)
export class RatingController {
	public constructor(private readonly service: RatingService) {}

	@ApiOperation({
		summary: 'Рейтинг успішності групи за семестр (формула 268.xlsx)'
	})
	@Get('group/:groupId')
	@HttpCode(HttpStatus.OK)
	public getGroupRating(
		@Param('groupId') groupId: string,
		@Query() query: GroupRatingQueryDto
	) {
		return this.service.getGroupRating(
			groupId,
			query.academicYear,
			query.semesterNumber
		)
	}

	@ApiOperation({ summary: 'Встановити додатковий бал студенту (upsert)' })
	@Put('bonus')
	@HttpCode(HttpStatus.OK)
	public async setBonus(
		@Body() dto: SetRatingBonusDto,
		@Authorized('id') userId: string
	) {
		await this.service.setBonus(dto, userId)
		return { ok: true }
	}

	@ApiOperation({ summary: 'Експорт рейтингу групи (.xlsx)' })
	@ApiQuery({ name: 'academicYear', required: true })
	@ApiQuery({ name: 'semesterNumber', required: true, type: Number })
	@ApiResponse({ status: 200, description: '.xlsx файл рейтингу' })
	@Get('group/:groupId/export')
	public async exportXlsx(
		@Param('groupId') groupId: string,
		@Query() query: GroupRatingQueryDto,
		@Res() res: Response
	) {
		const { buffer, filename } = await this.service.exportXlsx(
			groupId,
			query.academicYear,
			query.semesterNumber
		)
		const asciiName = filename.replace(/[^\x20-\x7E]/g, '_')
		res.set({
			'Content-Type': XLSX_MIME,
			'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
			'Content-Length': String(buffer.length)
		})
		res.end(buffer)
	}
}
