import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class IdentityListItemDto {
  @ApiProperty({ description: 'Ідентифікатор заяви' })
  @IsInt()
  id!: number;
}

export class PersonRequestChangeStatusParamsDto {
  @ApiProperty({
    type: [IdentityListItemDto],
    description: 'Список заяв для яких встановлюється статус',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IdentityListItemDto)
  personRequestList!: IdentityListItemDto[];

  @ApiPropertyOptional({ description: 'Код статусу заяви, що встановлюється' })
  @IsInt()
  @IsOptional()
  personRequestStatusTypeId?: number;

  @ApiPropertyOptional({
    description: 'Перелік даних, які потребують уточнення та спосіб їх подання, до статусу 2 "Затримано"',
  })
  @IsString()
  @IsOptional()
  delayDescription?: string;

  @ApiPropertyOptional({
    description: 'Час та місце проведення творчого конкурсу, до статусу 5 "Зареєстровано"',
  })
  @IsString()
  @IsOptional()
  registrationDescryption?: string;

  @ApiPropertyOptional({
    description: 'Допущено до участі в конкурсі: 2 - бюджет та контракт; 1 - тільки бюджет; 0 - тільки контракт, до статусу 6 "Допущено"',
  })
  @IsInt()
  @IsOptional()
  enrollLevel?: number;

  @ApiPropertyOptional({
    description: 'Ознака "Вступник може брати участь у конкурсі на контракт"',
  })
  @IsBoolean()
  @IsOptional()
  budgetDenyCanContract?: boolean;

  @ApiPropertyOptional({
    description: 'Код причини допуску лише на контракт, до статусу 6 "Допущено" (7 "Відмова")',
  })
  @IsInt()
  @IsOptional()
  contractReasonId?: number;

  @ApiPropertyOptional({ description: 'Причина відмови, до статусу 7 "Відмова"' })
  @IsString()
  @IsOptional()
  denyDescription?: string;

  @ApiPropertyOptional({
    description: 'Код акту про допущену технічну помилку, до статусу 8 "Скасовано (ЗО)"',
  })
  @IsInt()
  @IsOptional()
  requestCancellationId?: number;

  @ApiPropertyOptional({
    description: 'Опис причини скасування, до статусу 8 "Скасовано (ЗО)"',
  })
  @IsString()
  @IsOptional()
  cancellationDescription?: string;

  @ApiPropertyOptional({
    description: 'Тип конкурсу за яким отримано рекомендацію на бюджет, до статусу 9 "Рекомендовано(бюджет)"',
  })
  @IsInt()
  @IsOptional()
  budgetRecommendationTypeId?: number;

  @ApiPropertyOptional({
    description: 'Причина відхилення, до статусу 10 "Відхилено (бюджет)"',
  })
  @IsString()
  @IsOptional()
  budgetRejectDescription?: string;

  @ApiPropertyOptional({
    description: 'Тип конкурсу за яким отримано рекомендацію на контракт, до статусу 12 "Рекомендовано(контракт)"',
  })
  @IsInt()
  @IsOptional()
  contractRecommendationTypeId?: number;

  @ApiPropertyOptional({
    description: 'Причина відхилення, до статусу 13 "Відхилено (контракт)"',
  })
  @IsString()
  @IsOptional()
  contractRejectDescription?: string;

  @ApiPropertyOptional({
    description: 'Код наказу про зарахування, до статусу 14 "До наказу"',
  })
  @IsInt()
  @IsOptional()
  orderOfEnrollmentId?: number;

  @ApiPropertyOptional({
    description: 'Чи перевести статус не зважаючи на недіючий документ вступника, до статусу 14 "До наказу"',
  })
  @IsBoolean()
  @IsOptional()
  isIgnoreBadDocument?: boolean;

  @ApiPropertyOptional({
    description: 'Чи користувач підтверджує автоматичну ануляцію інших заяв вступника на контракт, до статусу 14 "До наказу"',
  })
  @IsBoolean()
  @IsOptional()
  isAcknowledgeOtherContractCancels?: boolean;
}
