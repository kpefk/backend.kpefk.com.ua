import { Injectable, NotFoundException } from '@nestjs/common'
import type { TeacherAttestation } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import {
	type AttestationStatus,
	classifyAttestationStatus,
	computeNextAttestationDate
} from './attestation-status'
import type { CreateAttestationDto } from './dto/create-attestation.dto'
import type { UpdateAttestationDto } from './dto/update-attestation.dto'

export interface AttestationDueRow {
	teacher: {
		id: string
		fullName: string
		positionName: string | null
		skillName: string | null
		dignityNames: string | null
	}
	lastAttestationDate: string | null
	nextAttestationDate: string | null
	status: AttestationStatus
}

@Injectable()
export class AttestationsService {
	public constructor(private readonly prisma: PrismaService) {}

	// ── Per-teacher CRUD ─────────────────────────────────────────────────────────

	public async findAll(teacherId: string): Promise<TeacherAttestation[]> {
		await this.requireTeacher(teacherId)
		return this.prisma.teacherAttestation.findMany({
			where: { teacherId },
			orderBy: { attestationDate: 'desc' }
		})
	}

	public async create(
		teacherId: string,
		dto: CreateAttestationDto,
		userId: string
	): Promise<TeacherAttestation> {
		await this.requireTeacher(teacherId)

		const attestationDate = new Date(dto.attestationDate)
		const nextAttestationDate = dto.nextAttestationDate
			? new Date(dto.nextAttestationDate)
			: computeNextAttestationDate(attestationDate)

		return this.prisma.teacherAttestation.create({
			data: {
				teacherId,
				attestationDate,
				type: dto.type,
				resultCategory: dto.resultCategory,
				resultTitle: dto.resultTitle ?? null,
				correspondsToPosition: dto.correspondsToPosition ?? true,
				orderNumber: dto.orderNumber ?? null,
				orderDate: dto.orderDate ? new Date(dto.orderDate) : null,
				nextAttestationDate,
				notes: dto.notes ?? null,
				createdById: userId
			}
		})
	}

	public async update(
		teacherId: string,
		id: string,
		dto: UpdateAttestationDto
	): Promise<TeacherAttestation> {
		await this.requireOwned(teacherId, id)

		return this.prisma.teacherAttestation.update({
			where: { id },
			data: {
				attestationDate: dto.attestationDate
					? new Date(dto.attestationDate)
					: undefined,
				type: dto.type,
				resultCategory: dto.resultCategory,
				resultTitle: dto.resultTitle,
				correspondsToPosition: dto.correspondsToPosition,
				orderNumber: dto.orderNumber,
				orderDate:
					dto.orderDate === undefined
						? undefined
						: dto.orderDate
							? new Date(dto.orderDate)
							: null,
				nextAttestationDate: dto.nextAttestationDate
					? new Date(dto.nextAttestationDate)
					: undefined,
				notes: dto.notes
			}
		})
	}

	public async remove(
		teacherId: string,
		id: string
	): Promise<TeacherAttestation> {
		await this.requireOwned(teacherId, id)
		return this.prisma.teacherAttestation.delete({ where: { id } })
	}

	// ── Institution-wide due tracker ─────────────────────────────────────────────

	public async getDue(referenceYear: number): Promise<AttestationDueRow[]> {
		const teachers = await this.prisma.teacher.findMany({
			where: { isActive: true },
			select: {
				id: true,
				lastName: true,
				firstName: true,
				middleName: true,
				positionName: true,
				skillName: true,
				dignityNames: true,
				attestations: {
					orderBy: { attestationDate: 'desc' },
					take: 1,
					select: { attestationDate: true, nextAttestationDate: true }
				}
			},
			orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
		})

		const rows: AttestationDueRow[] = teachers.map(t => {
			const last = t.attestations[0] ?? null
			const nextDate = last?.nextAttestationDate ?? null
			return {
				teacher: {
					id: t.id,
					fullName: [t.lastName, t.firstName, t.middleName]
						.filter(Boolean)
						.join(' '),
					positionName: t.positionName,
					skillName: t.skillName,
					dignityNames: t.dignityNames
				},
				lastAttestationDate:
					last?.attestationDate.toISOString() ?? null,
				nextAttestationDate: nextDate?.toISOString() ?? null,
				status: classifyAttestationStatus(nextDate, referenceYear)
			}
		})

		// OK (атестація в майбутньому) приховуємо — трекер показує лише тих, хто потребує уваги.
		return rows.filter(r => r.status !== 'OK')
	}

	// ── Helpers ──────────────────────────────────────────────────────────────────

	private async requireTeacher(teacherId: string): Promise<void> {
		const teacher = await this.prisma.teacher.findUnique({
			where: { id: teacherId }
		})
		if (!teacher) throw new NotFoundException('Викладача не знайдено.')
	}

	private async requireOwned(teacherId: string, id: string): Promise<void> {
		const record = await this.prisma.teacherAttestation.findUnique({
			where: { id }
		})
		if (!record || record.teacherId !== teacherId) {
			throw new NotFoundException('Запис атестації не знайдено.')
		}
	}
}
