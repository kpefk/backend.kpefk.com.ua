import type {
	MobilityDirection,
	NationalGrade,
	RecognitionStatus
} from '@prisma/client'

export class AcademicMobilityItemDto {
	id!: string
	curriculumComponentTermId!: string
	componentName!: string
	componentCode!: string | null
	semesterNumber!: number
	academicYear!: string
	creditsEcts!: number
	finalGrade!: number | null
	nationalGrade!: NationalGrade
	partnerComponentName!: string | null
	generatedGradeId!: string | null
}

export class AcademicMobilityDto {
	id!: string
	studentId!: string
	studentName!: string
	direction!: MobilityDirection
	status!: RecognitionStatus
	partnerInstitutionName!: string
	partnerUniversityId!: string | null
	country!: string | null
	periodFrom!: string
	periodTo!: string
	agreementNumber!: string | null
	agreementDate!: string | null
	protocolNumber!: string | null
	protocolDate!: string | null
	notes!: string | null
	totalEcts!: number
	items!: AcademicMobilityItemDto[]
	createdAt!: string
}
