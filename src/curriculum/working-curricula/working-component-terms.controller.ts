import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { UpdateWorkingComponentTermDto } from './dto/update-working-component-term.dto'
import { WorkingCurriculaService } from './working-curricula.service'

const WRITE_ROLES = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.SCHEDULE_DISPATCHER,
  UserRole.ADMINISTRATOR,
]

@ApiTags('Навчальний план — Робочі навчальні плани')
@ApiBearerAuth('access-token')
@Controller('working-component-terms')
@Authorization()
export class WorkingComponentTermsController {
  public constructor(private readonly workingCurriculaService: WorkingCurriculaService) {}

  @ApiOperation({
    summary: 'Оновити розбивку годин для одного компонента (PATCH)',
    description:
      'Часткове оновлення WorkingCurriculumComponentTerm за його власним ID. ' +
      'Не вказані поля залишаються без змін. ' +
      'Загальна сума годин може перевищувати componentTerm.hours: це поле зберігає ' +
      'аудиторний орієнтовний обсяг, а робочий план включає самостійну роботу і консультації.',
  })
  @ApiParam({ name: 'id', description: 'UUID рядка WorkingCurriculumComponentTerm' })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 400, description: 'Затверджений план або запис не знайдено' })
  @ApiResponse({ status: 404 })
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @Authorization(...WRITE_ROLES)
  public updateComponentTerm(
    @Param('id') id: string,
    @Body() dto: UpdateWorkingComponentTermDto,
  ) {
    return this.workingCurriculaService.updateComponentTerm(id, dto)
  }
}
