import { ApiProperty } from '@nestjs/swagger'
import { CalendarWeekType } from '@prisma/client'
import { IsEnum, IsInt, Max, Min } from 'class-validator'

export class CreateCalendarEntryDto {
  @ApiProperty({ description: 'Номер курсу', example: 1 })
  @IsInt()
  @Min(1)
  @Max(6)
  courseNumber!: number

  @ApiProperty({ description: 'Номер семестру', example: 2 })
  @IsInt()
  @Min(1)
  @Max(12)
  semesterNumber!: number

  @ApiProperty({ description: 'Номер тижня', example: 15 })
  @IsInt()
  @Min(1)
  @Max(60)
  weekNumber!: number

  @ApiProperty({ enum: CalendarWeekType, description: 'Тип тижня' })
  @IsEnum(CalendarWeekType, { message: 'Невалідний тип тижня.' })
  weekType!: CalendarWeekType
}
