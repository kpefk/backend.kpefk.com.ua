import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger'
import { UserRole } from '@prisma/client'
import type { Request } from 'express'

import { Authorization } from '@/auth/decorators/auth.decorator'

import { CreateIndividualPlanDto } from './dto/create-individual-plan.dto'
import { CreatePlanItemDto } from './dto/create-plan-item.dto'
import { UpdatePlanItemDto } from './dto/update-plan-item.dto'
import { IndividualPlansService } from './individual-plans.service'

@ApiTags('Індивідуальні навчальні плани')
@ApiBearerAuth('access-token')
@Controller('individual-plans')
@Authorization()
export class IndividualPlansController {
  public constructor(private readonly service: IndividualPlansService) {}

  @ApiOperation({ summary: 'ІНП студента' })
  @ApiQuery({ name: 'studentId', required: true })
  @Authorization(
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Get('by-student')
  @HttpCode(HttpStatus.OK)
  public findByStudent(@Query('studentId') studentId: string) {
    return this.service.findByStudent(studentId)
  }

  @ApiOperation({ summary: 'ІНП усіх студентів групи' })
  @ApiQuery({ name: 'groupId', required: true })
  @Authorization(
    UserRole.HEAD_OF_DEPARTMENT,
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Get('by-group')
  @HttpCode(HttpStatus.OK)
  public findByGroup(@Query('groupId') groupId: string) {
    return this.service.findByGroup(groupId)
  }

  @ApiOperation({ summary: 'Створити ІНП для студента' })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Post()
  @HttpCode(HttpStatus.CREATED)
  public create(
    @Req() req: Request & { user: { id: string } },
    @Body() dto: CreateIndividualPlanDto,
  ) {
    return this.service.create(dto, (req.user as unknown as { id: string }).id)
  }

  @ApiOperation({ summary: 'Масове створення ІНП для групи (§3.11)' })
  @ApiQuery({ name: 'groupId', required: true })
  @ApiQuery({ name: 'assignmentId', required: true })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Post('generate-for-group')
  @HttpCode(HttpStatus.OK)
  public generateForGroup(
    @Req() req: Request & { user: { id: string } },
    @Query('groupId') groupId: string,
    @Query('assignmentId') assignmentId: string,
  ) {
    return this.service.generateForGroup(
      groupId,
      assignmentId,
      (req.user as unknown as { id: string }).id,
    )
  }

  @ApiOperation({ summary: 'Додати запис до ІНП' })
  @ApiParam({ name: 'planId' })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Post(':planId/items')
  @HttpCode(HttpStatus.CREATED)
  public addItem(@Param('planId') planId: string, @Body() dto: CreatePlanItemDto) {
    return this.service.addItem(planId, dto)
  }

  @ApiOperation({ summary: 'Оновити запис ІНП' })
  @ApiParam({ name: 'itemId' })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Patch('items/:itemId')
  @HttpCode(HttpStatus.OK)
  public updateItem(@Param('itemId') itemId: string, @Body() dto: UpdatePlanItemDto) {
    return this.service.updateItem(itemId, dto)
  }

  @ApiOperation({ summary: 'Видалити запис з ІНП' })
  @ApiParam({ name: 'itemId' })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Delete('items/:itemId')
  @HttpCode(HttpStatus.OK)
  public removeItem(@Param('itemId') itemId: string) {
    return this.service.removeItem(itemId)
  }

  @ApiOperation({ summary: 'Затвердити ІНП' })
  @ApiParam({ name: 'id' })
  @Authorization(
    UserRole.DEPUTY_DIRECTOR,
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  public approve(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.service.approve(id, (req.user as unknown as { id: string }).id)
  }

  @ApiOperation({ summary: 'Видалити ІНП' })
  @ApiParam({ name: 'id' })
  @Authorization(
    UserRole.DIRECTOR,
    UserRole.ADMINISTRATOR,
  )
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  public delete(@Param('id') id: string) {
    return this.service.delete(id)
  }
}
