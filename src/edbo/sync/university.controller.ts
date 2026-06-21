import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { EdboSyncService } from './edbo-sync.service'

/**
 * Перегляд інформації про заклад освіти (ВСП КПЕФК) з ЄДЕБО.
 * Доступно будь-якому автентифікованому користувачу (публічна інформація закладу).
 * Синхронізація живе в EdboSyncController (лише ADMINISTRATOR).
 */
@ApiTags('Заклад освіти')
@Controller('university')
@Authorization()
export class UniversityController {
  public constructor(private readonly edboSyncService: EdboSyncService) {}

  @ApiOperation({ summary: 'Інформація про заклад освіти' })
  @ApiResponse({ status: 200, description: 'University | null' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public getUniversity() {
    return this.edboSyncService.getUniversity()
  }
}
