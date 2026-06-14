import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CreateQualificationUpgradeDto } from './dto/create-qualification-upgrade.dto'
import { QualificationUpgradesService } from './qualification-upgrades.service'

@ApiTags('Підвищення кваліфікації')
@ApiBearerAuth('access-token')
@Controller('staff/:teacherId/qualification-upgrades')
@Authorization()
export class QualificationUpgradesController {
  public constructor(private readonly service: QualificationUpgradesService) {}

  @ApiOperation({ summary: 'Список записів підвищення кваліфікації викладача' })
  @ApiParam({ name: 'teacherId', description: 'ID викладача' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public findAll(@Param('teacherId') teacherId: string) {
    return this.service.findAll(teacherId)
  }

  @ApiOperation({ summary: 'Додати запис підвищення кваліфікації' })
  @ApiParam({ name: 'teacherId', description: 'ID викладача' })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public create(@Param('teacherId') teacherId: string, @Body() dto: CreateQualificationUpgradeDto) {
    return this.service.create(teacherId, dto)
  }

  @ApiOperation({ summary: 'Видалити запис підвищення кваліфікації' })
  @ApiParam({ name: 'teacherId', description: 'ID викладача' })
  @ApiParam({ name: 'id', description: 'ID запису' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  public remove(@Param('teacherId') teacherId: string, @Param('id') id: string) {
    return this.service.remove(teacherId, id)
  }
}
