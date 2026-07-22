import type {
	CreditRecognitionType,
	NationalGrade,
	RecognitionStatus
} from '@prisma/client'

export class CreditRecognitionItemDto {
	id!: string
	curriculumComponentTermId!: string
	componentName!: string
	componentCode!: string | null
	semesterNumber!: number
	academicYear!: string
	creditsEcts!: number
	finalGrade!: number | null
	nationalGrade!: NationalGrade
	generatedGradeId!: string | null
}

export class CreditRecognitionDto {
	id!: string
	studentId!: string
	studentName!: string
	type!: CreditRecognitionType
	status!: RecognitionStatus
	sourceInstitutionName!: string
	sourceUniversityId!: string | null
	sourceDocument!: string | null
	sourceDocumentDate!: string | null
	protocolNumber!: string | null
	protocolDate!: string | null
	notes!: string | null
	totalEcts!: number
	items!: CreditRecognitionItemDto[]
	createdAt!: string
}
