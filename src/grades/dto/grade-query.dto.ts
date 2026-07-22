import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator'

export class GradesByComponentTermQueryDto {
	@IsUUID('4')
	groupId!: string

	@IsString()
	academicYear!: string
}

export class GradesByStudentQueryDto {
	@IsOptional()
	@IsString()
	academicYear?: string

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	semesterNumber?: number
}

export class RetakeHistoryQueryDto {
	@IsUUID('4')
	studentId!: string

	@IsUUID('4')
	componentTermId!: string
}

export class MyDisciplinesQueryDto {
	@IsString()
	academicYear!: string
}
