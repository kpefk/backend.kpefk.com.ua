import { ApiPropertyOptional } from '@nestjs/swagger';

export class UniversityExamListResponseDto {
  @ApiPropertyOptional({ description: 'ID запису' })
  universityExamId?: number | null;

  @ApiPropertyOptional({ description: 'Код закладу освіти' })
  universityId?: number | null;

  @ApiPropertyOptional({ description: 'Назва закладу освіти' })
  universityFullName?: string | null;

  @ApiPropertyOptional({ description: 'ID форми випробування' })
  examFormId?: number | null;

  @ApiPropertyOptional({ description: 'Назва форми випробування' })
  examFormName?: string | null;

  @ApiPropertyOptional({ description: 'ID предмету вступного випробування (з довідника)' })
  subjectId?: number | null;

  @ApiPropertyOptional({ description: 'Предмет вступного випробування (з довідника)' })
  subjectNameFromDict?: string | null;

  @ApiPropertyOptional({ description: 'Назва вступного випробування (не з довідника)' })
  subjectName?: string | null;

  @ApiPropertyOptional({ description: 'Назва вступного випробування (результуюча)' })
  subjectNameFull?: string | null;

  @ApiPropertyOptional({ description: 'ID спеціальності (для творчих конкурсів)' })
  specialityId?: number | null;

  @ApiPropertyOptional({ description: 'Повна назва спеціальності (для творчих конкурсів)' })
  specialityFullName?: string | null;

  @ApiPropertyOptional({ description: 'ID спеціалізації (для творчих конкурсів)' })
  specializationId?: number | null;

  @ApiPropertyOptional({ description: 'Повна назва спеціалізації (для творчих конкурсів)' })
  specializationFullName?: string | null;

  @ApiPropertyOptional({ description: 'Чи відображається запис в електронному кабінеті' })
  isForReplication?: boolean | null;

  @ApiPropertyOptional({ description: 'Чи є подані активні заяви' })
  hasRequests?: boolean | null;

  @ApiPropertyOptional({ description: 'Код випробування ЗО правонаступника' })
  universityExamTransferId?: number | null;

  @ApiPropertyOptional({ description: 'Дата створення запису' })
  createDate?: Date | null;

  @ApiPropertyOptional({ description: 'Користувач, що створив запис' })
  createUser?: string | null;

  @ApiPropertyOptional({ description: 'Дата редагування запису' })
  modifyDate?: Date | null;

  @ApiPropertyOptional({ description: 'Користувач, що змінив запис' })
  modifyUser?: string | null;
}
