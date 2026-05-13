import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { EntranceService } from './entrance.service';

import { CancellationAddParamsDto } from './dto/cancellation-add-params.dto';
import { CancellationAddResponseDto } from './dto/cancellation-add-response.dto';
import { CancellationDelParamsDto } from './dto/cancellation-del-params.dto';
import { CancellationListParamsDto } from './dto/cancellation-list-params.dto';
import { CancellationListItemDto } from './dto/cancellation-list-response.dto';
import { CancellationUpdateParamsDto } from './dto/cancellation-update-params.dto';
import { EnrollOrderGetParamsDto } from './dto/enroll-order-get-params.dto';
import { EnrollOrderGetResponseDto } from './dto/enroll-order-get-response.dto';
import { EnrollOrderListParamsDto } from './dto/enroll-order-list-params.dto';
import { EnrollOrderListItemDto } from './dto/enroll-order-list-response.dto';
import { ExaminationAddParamsDto } from './dto/examination-add-params.dto';
import { ExaminationCheckParamsDto } from './dto/examination-check-params.dto';
import { ExaminationCheckResponseDto } from './dto/examination-check-response.dto';
import { ExaminationDelParamsDto } from './dto/examination-del-params.dto';
import { PersonRequestCategoryListParamsDto } from './dto/person-request-category-list-params.dto';
import { PersonRequestCategoryListItemDto } from './dto/person-request-category-list-response.dto';

@ApiTags('Entrance — ЄДЕБО')
@Controller('entrance')
export class EntranceController {
  constructor(private readonly entranceService: EntranceService) {}

  // ── Cancellation ─────────────────────────────────────────────────

  @Post('cancellation/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Акти про технічні помилки. Перелік' })
  @ApiOkResponse({ type: [CancellationListItemDto] })
  cancellationList(@Body() params: CancellationListParamsDto) {
    return this.entranceService.cancellationList(params);
  }

  @Post('cancellation/add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Створити акт про допущені технічні помилки' })
  @ApiOkResponse({ type: CancellationAddResponseDto })
  cancellationAdd(@Body() params: CancellationAddParamsDto) {
    return this.entranceService.cancellationAdd(params);
  }

  @Post('cancellation/update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Редагувати акт про допущені технічні помилки' })
  @ApiOkResponse({ schema: { type: 'boolean' } })
  cancellationUpdate(@Body() params: CancellationUpdateParamsDto) {
    return this.entranceService.cancellationUpdate(params);
  }

  @Post('cancellation/del')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Видалити акт про допущені технічні помилки' })
  @ApiOkResponse({ schema: { type: 'boolean' } })
  cancellationDel(@Body() params: CancellationDelParamsDto) {
    return this.entranceService.cancellationDel(params);
  }

  // ── EnrollOrder ──────────────────────────────────────────────────

  @Post('enrollOrder/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Накази на зарахування. Перелік' })
  @ApiOkResponse({ type: [EnrollOrderListItemDto] })
  enrollOrderList(@Body() params: EnrollOrderListParamsDto) {
    return this.entranceService.enrollOrderList(params);
  }

  @Post('enrollOrder/get')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Накази на зарахування. Детальна інформація' })
  @ApiOkResponse({ type: EnrollOrderGetResponseDto })
  enrollOrderGet(@Body() params: EnrollOrderGetParamsDto) {
    return this.entranceService.enrollOrderGet(params);
  }

  // ── Examination ──────────────────────────────────────────────────

  @Post('examination/add')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Приймальні/відбіркові комісії. Додавання' })
  @ApiOkResponse({ schema: { type: 'boolean' } })
  examinationAdd(@Body() params: ExaminationAddParamsDto) {
    return this.entranceService.examinationAdd(params);
  }

  @Post('examination/check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Приймальні/відбіркові комісії. Перевірка перед видаленням' })
  @ApiOkResponse({ type: ExaminationCheckResponseDto })
  examinationCheck(@Body() params: ExaminationCheckParamsDto) {
    return this.entranceService.examinationCheck(params);
  }

  @Post('examination/del')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Приймальні/відбіркові комісії. Видалення' })
  @ApiOkResponse({ schema: { type: 'boolean' } })
  examinationDel(@Body() params: ExaminationDelParamsDto) {
    return this.entranceService.examinationDel(params);
  }

  // ── PersonRequest Categories ─────────────────────────────────────

  @Post('personRequest/category/list')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Заяви вступників. Перелік категорій вступника' })
  @ApiOkResponse({ type: [PersonRequestCategoryListItemDto] })
  personRequestCategoryList(@Body() params: PersonRequestCategoryListParamsDto) {
    return this.entranceService.personRequestCategoryList(params);
  }
}
