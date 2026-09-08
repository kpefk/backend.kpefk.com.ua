import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { Prisma, Student } from '@prisma/client'

import {
	GoogleWorkspaceService,
	ProvisionResult
} from '@/libs/google-workspace/google-workspace.service'
import { PrismaService } from '@/prisma/prisma.service'

import { StudentListStatus } from './dto/student-list-query.dto'
import { STUDENT_LIST_SELECT, StudentListItem } from './student.constants'

export interface BulkProvisionResult {
	provisioned: number
	skipped: number
	failed: number
	total: number
	failures: Array<{
		studentId: string
		personFIO: string
		message: string
	}>
}

@Injectable()
export class StudentService {
	private readonly logger = new Logger(StudentService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly workspace: GoogleWorkspaceService
	) {}

	/**
	 * Список студентів у полегшеній проекції (без ПДн) з фільтром за станом навчання.
	 * @param status - `active` (навчається), `inactive` або `all` (типово).
	 */
	public async findAll(
		status: StudentListStatus = 'all'
	): Promise<StudentListItem[]> {
		return this.prisma.student.findMany({
			where: this.buildStatusWhere(status),
			select: STUDENT_LIST_SELECT,
			orderBy: [{ personFIO: 'asc' }]
		})
	}

	/**
	 * «Навчається» = не відрахований, не в академвідпустці і строк навчання ще не сплив.
	 * Дзеркалить `studentStatus()` на клієнті.
	 */
	private buildStatusWhere(
		status: StudentListStatus
	): Prisma.StudentWhereInput {
		if (status === 'all') return {}

		const studying: Prisma.StudentWhereInput = {
			expelEducationTypeName: null,
			academicLeaveTypeName: null,
			OR: [
				{ educationDateEnd: null },
				{ educationDateEnd: { gte: new Date() } }
			]
		}

		return status === 'active' ? studying : { NOT: studying }
	}

	public async findById(id: string): Promise<Student> {
		const student = await this.prisma.student.findUnique({ where: { id } })
		if (!student) throw new NotFoundException('Студента не знайдено.')
		return student
	}

	/**
	 * Генерує корпоративну адресу для студента та зберігає її в БД.
	 * Якщо адреса вже збережена — повертає існуючу без виклику Admin API.
	 * Якщо потрібно створити акаунт — передає виклик у GoogleWorkspaceService.
	 */
	public async provisionEmail(id: string): Promise<ProvisionResult> {
		const student = await this.findById(id)

		if (student.corporateEmail) {
			return { email: student.corporateEmail, created: false }
		}

		const email = this.workspace.buildStudentEmail({
			personNameEn: student.personNameEn,
			personFIO: student.personFIO,
			birthday: student.birthday,
			fullSpecialityName: student.fullSpecialityName,
			educationDateBegin: student.educationDateBegin
		})

		const result = await this.workspace.provisionAccount(email, {
			personNameEn: student.personNameEn,
			personFIO: student.personFIO,
			birthday: student.birthday,
			fullSpecialityName: student.fullSpecialityName,
			educationDateBegin: student.educationDateBegin
		})

		await this.prisma.student.update({
			where: { id },
			data: { corporateEmail: email }
		})

		return result
	}

	/**
	 * Масове створення акаунтів для переданих студентів без corporateEmail.
	 * Обробляє по одному, щоб не перевантажувати Admin API.
	 */
	public async provisionAllEmails(
		studentIds: string[]
	): Promise<BulkProvisionResult> {
		const students = await this.prisma.student.findMany({
			where: {
				id: { in: studentIds },
				corporateEmail: null
			},
			select: {
				id: true,
				personNameEn: true,
				personFIO: true,
				birthday: true,
				fullSpecialityName: true,
				educationDateBegin: true
			}
		})

		const result: BulkProvisionResult = {
			provisioned: 0,
			skipped: 0,
			failed: 0,
			total: students.length,
			failures: []
		}

		for (const student of students) {
			try {
				const email = this.workspace.buildStudentEmail(student)

				const { created } = await this.workspace.provisionAccount(
					email,
					student
				)

				await this.prisma.student.update({
					where: { id: student.id },
					data: { corporateEmail: email }
				})

				created ? result.provisioned++ : result.skipped++
			} catch (error: unknown) {
				result.failed++
				const message =
					error instanceof Error ? error.message : 'Невідома помилка'
				result.failures.push({
					studentId: student.id,
					personFIO: student.personFIO,
					message
				})
				this.logger.error(
					`Bulk email provisioning failed for ${student.id} (${student.personFIO}): ${message}`
				)
			}
		}

		return result
	}

	/**
	 * Повертає лише згенерований email без створення акаунту в Workspace.
	 * Корисно для попереднього перегляду.
	 */
	public previewEmail(id: string): Promise<{ email: string }> {
		return this.findById(id).then(student => ({
			email: this.workspace.buildStudentEmail({
				personNameEn: student.personNameEn,
				personFIO: student.personFIO,
				birthday: student.birthday,
				fullSpecialityName: student.fullSpecialityName,
				educationDateBegin: student.educationDateBegin
			})
		}))
	}
}
