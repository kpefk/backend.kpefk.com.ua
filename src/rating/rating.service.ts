import { Injectable, NotFoundException } from '@nestjs/common'
import { SemesterGradeStatus } from '@prisma/client'
import * as XLSX from 'xlsx'

import { activeStudentWhere } from '@/libs/common/active-student'
import { PrismaService } from '@/prisma/prisma.service'

import type {
	GroupRatingDto,
	RatingRowDto,
	SetRatingBonusDto
} from './dto/rating.dto'
import {
	assignRanks,
	normalizeGradeTo100,
	roundedAverage
} from './rating-formula'
import { isBudgetPayment } from './rating.constants'

const round2 = (v: number): number => Math.round(v * 100) / 100

@Injectable()
export class RatingService {
	public constructor(private readonly prisma: PrismaService) {}

	// ── Rating table ───────────────────────────────────────────────────────────

	public async getGroupRating(
		groupId: string,
		academicYear: string,
		semesterNumber: number
	): Promise<GroupRatingDto> {
		const group = await this.prisma.group.findUnique({
			where: { id: groupId },
			select: { id: true, name: true }
		})
		if (!group) throw new NotFoundException('Групу не знайдено.')

		const students = await this.prisma.student.findMany({
			where: { groupId, ...activeStudentWhere() },
			select: {
				id: true,
				personFIO: true,
				personEducationPaymentTypeName: true
			},
			orderBy: { personFIO: 'asc' }
		})
		const studentIds = students.map(s => s.id)

		// Лише числові оцінки: CREDIT pass/fail та «звільнений» (finalGrade=null) —
		// поза середнім, як «зв» у зразку 268.xlsx.
		const grades = await this.prisma.semesterGrade.findMany({
			where: {
				studentId: { in: studentIds },
				academicYear,
				status: SemesterGradeStatus.ACTIVE,
				finalGrade: { not: null },
				curriculumComponentTerm: { semesterNumber }
			},
			select: {
				studentId: true,
				finalGrade: true,
				gradeScale: true,
				curriculumComponentTerm: {
					select: {
						component: { select: { name: true, code: true } }
					}
				}
			},
			orderBy: { curriculumComponentTerm: { component: { name: 'asc' } } }
		})

		const bonuses = await this.prisma.studentRatingBonus.findMany({
			where: {
				studentId: { in: studentIds },
				academicYear,
				semesterNumber
			}
		})
		const bonusByStudent = new Map(bonuses.map(b => [b.studentId, b]))

		const gradesByStudent = new Map<string, typeof grades>()
		for (const g of grades) {
			let list = gradesByStudent.get(g.studentId)
			if (!list) {
				list = []
				gradesByStudent.set(g.studentId, list)
			}
			list.push(g)
		}

		// Побудова рядків. Рейтинг (unrounded) — для точного ранжування, як RANK у Excel.
		const rows: (RatingRowDto & { totalRaw: number | null })[] =
			students.map(s => {
				const sGrades = gradesByStudent.get(s.id) ?? []
				const disciplines = sGrades.map(g => ({
					componentName: g.curriculumComponentTerm.component.name,
					componentCode: g.curriculumComponentTerm.component.code,
					grade: g.finalGrade!,
					gradeScale: g.gradeScale,
					normalized: round2(
						normalizeGradeTo100(g.finalGrade!, g.gradeScale)
					)
				}))
				const normalizedRaw = sGrades.map(g =>
					normalizeGradeTo100(g.finalGrade!, g.gradeScale)
				)
				const avgRaw =
					normalizedRaw.length > 0
						? normalizedRaw.reduce((a, b) => a + b, 0) /
							normalizedRaw.length
						: null

				const bonus = bonusByStudent.get(s.id)
				const bonusPoints = bonus?.points ?? 0
				const isBudget = isBudgetPayment(
					s.personEducationPaymentTypeName
				)
				const totalRaw =
					isBudget && avgRaw !== null ? avgRaw + bonusPoints : null

				return {
					studentId: s.id,
					fullName: s.personFIO,
					paymentTypeName: s.personEducationPaymentTypeName,
					isBudget,
					disciplines,
					averageScore: roundedAverage(normalizedRaw),
					bonusPoints,
					bonusReason: bonus?.reason ?? null,
					totalScore: totalRaw !== null ? round2(totalRaw) : null,
					rank: null,
					totalRaw
				}
			})

		// Ранг — лише серед бюджетників з оцінками (RANK у межах групи, як у файлі).
		const ranked = rows.filter(r => r.totalRaw !== null)
		const ranks = assignRanks(ranked.map(r => r.totalRaw!))
		ranked.forEach((r, i) => {
			r.rank = ranks[i] ?? null
		})

		// Сортування: бюджетники за рангом, далі контрактники за балом, далі без оцінок.
		rows.sort((a, b) => {
			if (a.rank !== null && b.rank !== null) return a.rank - b.rank
			if (a.rank !== null) return -1
			if (b.rank !== null) return 1
			return (b.averageScore ?? -1) - (a.averageScore ?? -1)
		})

		return {
			groupId: group.id,
			groupName: group.name,
			academicYear,
			semesterNumber,
			budgetCount: ranked.length,
			rows: rows.map(({ totalRaw: _totalRaw, ...row }) => row)
		}
	}

	// ── Bonus points ───────────────────────────────────────────────────────────

	public async setBonus(
		dto: SetRatingBonusDto,
		userId: string
	): Promise<void> {
		const student = await this.prisma.student.findUnique({
			where: { id: dto.studentId },
			select: { id: true }
		})
		if (!student) throw new NotFoundException('Студента не знайдено.')

		await this.prisma.studentRatingBonus.upsert({
			where: {
				studentId_academicYear_semesterNumber: {
					studentId: dto.studentId,
					academicYear: dto.academicYear,
					semesterNumber: dto.semesterNumber
				}
			},
			create: {
				studentId: dto.studentId,
				academicYear: dto.academicYear,
				semesterNumber: dto.semesterNumber,
				points: dto.points,
				reason: dto.reason ?? null,
				updatedById: userId
			},
			update: {
				points: dto.points,
				reason: dto.reason ?? null,
				updatedById: userId
			}
		})
	}

	// ── XLSX export (структура аркуша «рейтинг» зі зразка 268.xlsx) ─────────────

	public async exportXlsx(
		groupId: string,
		academicYear: string,
		semesterNumber: number
	): Promise<{ buffer: Buffer; filename: string }> {
		const rating = await this.getGroupRating(
			groupId,
			academicYear,
			semesterNumber
		)

		// Об'єднаний упорядкований список дисциплін (колонки оцінок).
		const disciplineNames: string[] = []
		for (const row of rating.rows) {
			for (const d of row.disciplines) {
				if (!disciplineNames.includes(d.componentName))
					disciplineNames.push(d.componentName)
			}
		}

		const sheetRows = rating.rows.map((r, idx) => {
			const base: Record<string, string | number> = {
				'№': idx + 1,
				ПІБ: r.fullName,
				Форма: r.isBudget ? 'Б' : r.paymentTypeName ? 'К' : '?'
			}
			for (const name of disciplineNames) {
				const d = r.disciplines.find(x => x.componentName === name)
				base[name] = d ? d.grade : ''
			}
			base['Бал (100)'] = r.averageScore ?? ''
			base['Додатковий бал'] = r.bonusPoints
			base['Рейтинг'] = r.totalScore ?? ''
			base['Ранг'] = r.rank ?? ''
			return base
		})

		const ws = XLSX.utils.json_to_sheet(sheetRows)
		ws['!cols'] = [
			{ wch: 4 },
			{ wch: 32 },
			{ wch: 7 },
			...disciplineNames.map(() => ({ wch: 12 })),
			{ wch: 10 },
			{ wch: 14 },
			{ wch: 10 },
			{ wch: 6 }
		]
		const wb = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(wb, ws, 'рейтинг')

		const buffer = Buffer.from(
			XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as ArrayBuffer
		)
		const filename = `Рейтинг_${rating.groupName}_${academicYear}_сем${semesterNumber}.xlsx`
		return { buffer, filename }
	}
}
