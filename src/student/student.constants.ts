import { Prisma } from '@prisma/client'

/**
 * Проекція списку студентів — лише поля, потрібні для переліку та картки студента.
 * ПДн (РНОКПП, паспорт, студквиток, корпоративна пошта) навмисно НЕ віддаються:
 * вони доступні окремо в профілі особи, тож список їх не переносить мережею.
 */
export const STUDENT_LIST_SELECT = {
	id: true,
	userId: true,
	personId: true,
	educationId: true,

	personFIO: true,
	birthday: true,
	personSexName: true,

	licenseYear: true,
	educationDateBegin: true,
	educationDateEnd: true,
	facultyName: true,
	qualificationGroupName: true,
	educationFormId: true,
	educationFormName: true,
	isDualForm: true,
	isSecondHigher: true,
	isShortTerm: true,
	fullSpecialityName: true,
	studyProgramName: true,
	professionInfo: true,
	courseId: true,
	courseName: true,
	groupName: true,

	expelEducationTypeName: true,
	academicLeaveTypeName: true,
	foreignTypeName: true,
	budgetTransferCategoryName: true,

	createdAt: true,
	modifyDate: true
} satisfies Prisma.StudentSelect

/** Рядок списку студентів (проекція {@link STUDENT_LIST_SELECT}). */
export type StudentListItem = Prisma.StudentGetPayload<{
	select: typeof STUDENT_LIST_SELECT
}>
