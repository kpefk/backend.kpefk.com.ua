/**
 * Unit tests for WorkingCurriculaService — delete & approve guards.
 *
 * Covers 7 production invariants:
 *   1. Empty draft → can delete
 *   2. Empty draft → cannot approve
 *   3. Non-empty draft → cannot delete
 *   4. Non-empty draft → can approve
 *   5. Approved plan → cannot delete
 *   6. Plan with group assignments → cannot delete
 *   7. Already approved → approve throws
 *
 * All tests use a fully-mocked PrismaService — no real DB required.
 * Run: npx jest working-curricula.guards.spec.ts
 */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '../../prisma/prisma.service'
import { WorkingCurriculaService } from './working-curricula.service'

// ─── Prisma mock builder ──────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    workingCurriculum: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    workingCurriculumComponentTerm: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
      upsert: jest.fn(),
    },
    groupWorkingCurriculumAssignment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    group: { findUnique: jest.fn() },
    curriculumVersion: { findUnique: jest.fn() },
    groupCurriculumAssignment: { findUnique: jest.fn() },
    curriculumComponentTerm: { findUnique: jest.fn() },
  }
}

// ─── Data factories ───────────────────────────────────────────────────────────

function makeWc(overrides: {
  id?: string
  isApproved?: boolean
  groupAssignmentsCount?: number
} = {}) {
  return {
    id: overrides.id ?? 'wc-1',
    versionId: 'ver-1',
    academicYear: '2024-2025',
    semesterNumbers: [1, 2],
    isApproved: overrides.isApproved ?? false,
    approvedAt: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { groupAssignments: overrides.groupAssignmentsCount ?? 0 },
  }
}

/** All hours = 0 → empty plan */
const EMPTY_AGG = {
  _sum: {
    lectureHours: 0,
    practicalHours: 0,
    labHours: 0,
    seminarHours: 0,
    independentHours: 0,
    consultationHours: 0,
  },
}

/** Some hours filled → non-empty plan */
const NON_EMPTY_AGG = {
  _sum: {
    lectureHours: 30,
    practicalHours: 15,
    labHours: 0,
    seminarHours: 0,
    independentHours: 20,
    consultationHours: 0,
  },
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('WorkingCurriculaService — delete & approve guards', () => {
  let service: WorkingCurriculaService
  let prisma: ReturnType<typeof buildPrismaMock>

  beforeEach(async () => {
    prisma = buildPrismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkingCurriculaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get<WorkingCurriculaService>(WorkingCurriculaService)
  })

  // ── DELETE ─────────────────────────────────────────────────────────────────

  describe('delete()', () => {
    it('1. Empty draft plan → deletes successfully', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(EMPTY_AGG)
      prisma.workingCurriculum.delete.mockResolvedValue(makeWc())

      await expect(service.delete('wc-1')).resolves.toBeUndefined()
      expect(prisma.workingCurriculum.delete).toHaveBeenCalledWith({ where: { id: 'wc-1' } })
    })

    it('3. Non-empty draft plan → throws BadRequestException', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(NON_EMPTY_AGG)

      await expect(service.delete('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.workingCurriculum.delete).not.toHaveBeenCalled()
    })

    it('5. Approved plan → throws BadRequestException without touching DB', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc({ isApproved: true }))

      await expect(service.delete('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.workingCurriculumComponentTerm.aggregate).not.toHaveBeenCalled()
      expect(prisma.workingCurriculum.delete).not.toHaveBeenCalled()
    })

    it('6. Plan with group assignments → throws BadRequestException', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc({ groupAssignmentsCount: 2 }))

      await expect(service.delete('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.workingCurriculumComponentTerm.aggregate).not.toHaveBeenCalled()
      expect(prisma.workingCurriculum.delete).not.toHaveBeenCalled()
    })

    it('Not-found plan → throws NotFoundException', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(null)

      await expect(service.delete('missing')).rejects.toBeInstanceOf(NotFoundException)
    })

    it('Approved guard message contains "затвердж" (human-readable)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc({ isApproved: true }))
      const err = await service.delete('wc-1').catch((e: unknown) => e)
      expect(err).toBeInstanceOf(BadRequestException)
      expect((err as BadRequestException).message).toMatch(/затвердж/i)
    })

    it('Non-empty guard message references "розподіл" (human-readable)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(NON_EMPTY_AGG)
      const err = await service.delete('wc-1').catch((e: unknown) => e)
      expect((err as BadRequestException).message).toMatch(/розподіл/i)
    })
  })

  // ── APPROVE ────────────────────────────────────────────────────────────────

  describe('approve()', () => {
    it('2. Empty draft plan → throws BadRequestException (cannot approve)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(EMPTY_AGG)

      await expect(service.approve('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.workingCurriculum.update).not.toHaveBeenCalled()
    })

    it('4. Non-empty draft plan → approves successfully', async () => {
      const approved = { ...makeWc(), isApproved: true, approvedAt: new Date() }
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(NON_EMPTY_AGG)
      prisma.workingCurriculum.update.mockResolvedValue(approved)

      await expect(service.approve('wc-1')).resolves.toMatchObject({ isApproved: true })
      expect(prisma.workingCurriculum.update).toHaveBeenCalledWith({
        where: { id: 'wc-1' },
        data: expect.objectContaining({ isApproved: true }),
      })
    })

    it('7. Already approved plan → throws BadRequestException (no aggregate check)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc({ isApproved: true }))

      await expect(service.approve('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.workingCurriculumComponentTerm.aggregate).not.toHaveBeenCalled()
    })

    it('Approve error message references "розподіл годин" (human-readable)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(EMPTY_AGG)
      const err = await service.approve('wc-1').catch((e: unknown) => e)
      expect((err as BadRequestException).message).toMatch(/розподіл годин/i)
    })
  })

  // ── isEmpty edge cases ─────────────────────────────────────────────────────

  describe('isEmpty semantics', () => {
    it('All aggregate fields null (no terms at all) → treated as empty → approve blocked', async () => {
      const nullAgg = {
        _sum: {
          lectureHours: null,
          practicalHours: null,
          labHours: null,
          seminarHours: null,
          independentHours: null,
          consultationHours: null,
        },
      }
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(nullAgg)

      await expect(service.approve('wc-1')).rejects.toBeInstanceOf(BadRequestException)
    })

    it('Only consultationHours > 0 → treated as non-empty → approves successfully', async () => {
      const partialAgg = {
        _sum: {
          lectureHours: 0,
          practicalHours: 0,
          labHours: 0,
          seminarHours: 0,
          independentHours: 0,
          consultationHours: 5,
        },
      }
      const approved = { ...makeWc(), isApproved: true, approvedAt: new Date() }
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc())
      prisma.workingCurriculumComponentTerm.aggregate.mockResolvedValue(partialAgg)
      prisma.workingCurriculum.update.mockResolvedValue(approved)

      await expect(service.approve('wc-1')).resolves.toMatchObject({ isApproved: true })
    })

    it('Guard order: approved check runs before isEmpty check (no extra query)', async () => {
      prisma.workingCurriculum.findUnique.mockResolvedValue(makeWc({ isApproved: true }))

      await expect(service.delete('wc-1')).rejects.toBeInstanceOf(BadRequestException)
      // isEmptyById aggregate must NOT be called — approved guard fired first
      expect(prisma.workingCurriculumComponentTerm.aggregate).not.toHaveBeenCalled()
    })
  })
})
