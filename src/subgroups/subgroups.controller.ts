import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'

import { Authorization } from '@/auth/decorators/auth.decorator'
import { Authorized } from '@/auth/decorators/authorized.decorator'

import { SUBGROUP_MANAGER_ROLES } from './subgroups.constants'
import { SubgroupsService } from './subgroups.service'
import {
  AutoSplitDto,
  SetSubgroupsDto,
  SubgroupSplitQueryDto,
  SubgroupSubjectsQueryDto,
} from './dto/subgroups.dto'

@ApiTags('Підгрупи')
@ApiBearerAuth('access-token')
@Controller('subgroups')
@Authorization(...SUBGROUP_MANAGER_ROLES)
export class SubgroupsController {
  public constructor(private readonly subgroupsService: SubgroupsService) {}

  @ApiOperation({ summary: 'Дисципліни групи, що діляться на підгрупи (з лічильниками)' })
  @Get()
  @HttpCode(HttpStatus.OK)
  public listSubjects(@Query() query: SubgroupSubjectsQueryDto) {
    return this.subgroupsService.listSubjects(query)
  }

  @ApiOperation({ summary: 'Поточний поділ дисципліни (студенти × підгрупа)' })
  @Get(':componentTermId')
  @HttpCode(HttpStatus.OK)
  public getSplit(
    @Param('componentTermId') componentTermId: string,
    @Query() query: SubgroupSplitQueryDto,
  ) {
    return this.subgroupsService.getSplit(componentTermId, query)
  }

  @ApiOperation({ summary: 'Замінити повний поділ дисципліни на підгрупи' })
  @Put(':componentTermId')
  @HttpCode(HttpStatus.OK)
  public setSplit(
    @Param('componentTermId') componentTermId: string,
    @Body() dto: SetSubgroupsDto,
    @Authorized('id') userId: string,
  ) {
    return this.subgroupsService.setSplit(componentTermId, dto, userId)
  }

  @ApiOperation({ summary: 'Авто-поділ за списком (рівномірно на N підгруп)' })
  @Post(':componentTermId/auto-split')
  @HttpCode(HttpStatus.OK)
  public autoSplit(
    @Param('componentTermId') componentTermId: string,
    @Body() dto: AutoSplitDto,
    @Authorized('id') userId: string,
  ) {
    return this.subgroupsService.autoSplit(componentTermId, dto, userId)
  }
}
