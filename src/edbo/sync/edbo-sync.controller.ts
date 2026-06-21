import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'

import { Authorization } from '@/auth/decorators/auth.decorator'

import {
  EdboSyncService,
  SyncResult,
  UniversitySyncResult,
} from './edbo-sync.service'
import { SyncFilterDto } from './dto/sync-filter.dto'

@ApiTags('ЄДЕБО Синхронізація')
@Controller('edbo/sync')
// @Authorization(role) підключає і AuthGuard, і RolesGuard.
// Окремий @Roles() без UseGuards(RolesGuard) НЕ перевіряється — роль ігнорувалася.
@Authorization(UserRole.ADMINISTRATOR)
export class EdboSyncController {
  public constructor(private readonly edboSyncService: EdboSyncService) {}

  @ApiOperation({ summary: 'Синхронізація студентів з ЄДЕБО' })
  @ApiResponse({ status: 200, description: 'Результат синхронізації' })
  @Post('students')
  @HttpCode(HttpStatus.OK)
  public syncStudents(@Body() dto: SyncFilterDto): Promise<SyncResult> {
    return this.edboSyncService.syncStudents(dto.fromDate)
  }

  @ApiOperation({ summary: 'Синхронізація співробітників з ЄДЕБО' })
  @ApiResponse({ status: 200, description: 'Результат синхронізації' })
  @Post('staff')
  @HttpCode(HttpStatus.OK)
  public syncStaff(@Body() dto: SyncFilterDto): Promise<SyncResult> {
    return this.edboSyncService.syncStaff(dto.fromDate)
  }

  @ApiOperation({ summary: 'Синхронізація освітніх програм (ОПП) з ЄДЕБО' })
  @ApiResponse({ status: 200, description: 'Результат синхронізації' })
  @Post('study-programs')
  @HttpCode(HttpStatus.OK)
  public syncStudyPrograms(): Promise<SyncResult> {
    return this.edboSyncService.syncStudyPrograms()
  }

  @ApiOperation({ summary: 'Синхронізація інформації про заклад з ЄДЕБО' })
  @ApiResponse({ status: 200, description: 'Результат синхронізації закладу' })
  @Post('university')
  @HttpCode(HttpStatus.OK)
  public syncUniversity(): Promise<UniversitySyncResult> {
    return this.edboSyncService.syncUniversity()
  }

  @ApiOperation({ summary: 'Повна синхронізація (студенти + викладачі + документи)' })
  @Post('all')
  @HttpCode(HttpStatus.OK)
  public syncAll(): Promise<void> {
    return this.edboSyncService.scheduledSync()
  }
}
