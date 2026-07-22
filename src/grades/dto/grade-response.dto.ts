import type {
	GradeOrigin,
	GradeScale,
	NationalGrade,
	SemesterGradeStatus,
	TermControlForm
} from '@prisma/client'

export class SemesterGradeDto {
	id!: string
	studentId!: string
	studentName!: string
	curriculumComponentTermId!: string
	subjectName!: string
	componentCode!: string | null
	academicYear!: string
	semesterNumber!: number
	controlForm!: TermControlForm
	gradeScale!: GradeScale
	finalGrade!: number | null
	nationalGrade!: NationalGrade
	attempt!: number
	status!: SemesterGradeStatus
	recordedById!: string
	recordedAt!: string
}

export class GradeSheetStudentDto {
	studentId!: string
	fullName!: string
	grade!: SemesterGradeDto | null
	/** Середня поточна оцінка за семестр (AttendanceRecord.grade), для підказки формули ваг. */
	currentAverage!: number | null
}

export class GradeSheetDto {
	curriculumComponentTermId!: string
	subjectName!: string
	componentCode!: string | null
	controlForm!: TermControlForm | null
	gradeScale!: GradeScale
	ects!: number
	totalHours!: number
	semesterNumber!: number
	students!: GradeSheetStudentDto[]
}

export class StudentTranscriptGradeDto {
	id!: string
	subjectName!: string
	componentCode!: string | null
	ects!: number
	semesterNumber!: number
	controlForm!: TermControlForm
	gradeScale!: GradeScale
	finalGrade!: number | null
	nationalGrade!: NationalGrade
	attempt!: number
	/** Джерело оцінки: REGULAR / RECOGNIZED (перезарахування) / MOBILITY. */
	origin!: GradeOrigin
}

export class StudentTranscriptDto {
	studentId!: string
	fullName!: string
	grades!: StudentTranscriptGradeDto[]
}

export class TeacherDisciplineDto {
	curriculumComponentTermId!: string
	subjectName!: string
	componentCode!: string | null
	semesterNumber!: number
	controlForm!: TermControlForm | null
	gradeScale!: GradeScale
	groupId!: string | null
	groupName!: string | null
	academicYear!: string
}

export class GradeScaleInfoDto {
	gradeScale!: GradeScale
	min!: number
	max!: number
	controlForm!: TermControlForm | null
}
