/**
 * Unit tests for CurriculumComponentDisplayInSection (projection) logic.
 *
 * These tests use a fully-mocked PrismaService so no real database is required.
 * Each test exercises a specific production invariant that must hold forever.
 *
 * Run with: npx jest curriculum-versions.projections.spec.ts
 */
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '../../prisma/prisma.service'
import { CurriculumVersionsService } from './curriculum-versions.service'

// ─── Minimal mock factories ───────────────────────────────────────────────────

function makeDraftVersion(overrides: Partial<{ id: string; versionNumber: number }> = {}) {
  return {
    id: overrides.id ?? 'ver-1',
    versionNumber: overrides.versionNumber ?? 1,
    isPublished: false,
  }
}

function makePublishedVersion(overrides: Partial<{ id: string; versionNumber: number }> = {}) {
  return {
    id: overrides.id ?? 'ver-1',
    versionNumber: overrides.versionNumber ?? 1,
    isPublished: true,
  }
}

function makeSection(overrides: Partial<{ id: string; versionId: string }> = {}) {
  return {
    id: overrides.id ?? 'sec-1',
    versionId: overrides.versionId ?? 'ver-1',
    version: makeDraftVersion({ id: overrides.versionId ?? 'ver-1' }),
  }
}

function makeComponent(overrides: Partial<{ id: string; sectionId: string; versionId: string }> = {}) {
  const sectionId = overrides.sectionId ?? 'sec-1'
  const versionId = overrides.versionId ?? 'ver-1'
  return {
    id: overrides.id ?? 'comp-1',
    sectionId,
    section: {
      id: sectionId,
      versionId,
      version: makeDraftVersion({ id: versionId }),
    },
    terms: [],
  }
}

function makeProjection(overrides: Partial<{
  id: string; componentId: string; sectionId: string; versionId: string
}> = {}) {
  const componentId = overrides.componentId ?? 'comp-1'
  const sectionId = overrides.sectionId ?? 'sec-2'
  const versionId = overrides.versionId ?? 'ver-1'
  return {
    id: overrides.id ?? 'proj-1',
    componentId,
    sectionId,
    displayOrder: 0,
    displayMarker: null,
    displayNote: null,
    component: makeComponent({ id: componentId, versionId }),
  }
}

// ─── Prisma mock ──────────────────────────────────────────────────────────────

function buildPrismaMock() {
  return {
    curriculumVersion: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    curriculumSection: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    curriculumComponent: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    curriculumComponentTerm: { findMany: jest.fn(), create: jest.fn(), deleteMany: jest.fn() },
    curriculumComponentDisplayInSection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    electiveBlock: { create: jest.fn() },
    timeBudgetEntry: { create: jest.fn() },
    academicCalendarEntry: { create: jest.fn() },
    curriculum: { findUnique: jest.fn() },
    $transaction: jest.fn().mockImplementation((fn: (tx: unknown) => unknown) => {
      if (typeof fn === 'function') return fn({
        curriculumVersion: { create: jest.fn() },
        curriculumSection: { create: jest.fn() },
        curriculumComponent: { create: jest.fn() },
        curriculumComponentTerm: { create: jest.fn() },
        curriculumComponentDisplayInSection: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
        electiveBlock: { create: jest.fn() },
        timeBudgetEntry: { create: jest.fn() },
        academicCalendarEntry: { create: jest.fn() },
      })
      return fn
    }),
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('CurriculumVersionsService — projection invariants', () => {
  let service: CurriculumVersionsService
  let prisma: ReturnType<typeof buildPrismaMock>

  beforeEach(async () => {
    prisma = buildPrismaMock()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurriculumVersionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()
    service = module.get<CurriculumVersionsService>(CurriculumVersionsService)
  })

  // ── Scenario 1: projected rows do not affect totals ───────────────────────

  describe('findById — projected rows carry countsInTotals = false', () => {
    it('canonical components get countsInTotals = true', async () => {
      const version = {
        id: 'ver-1',
        isPublished: false,
        curriculum: { program: { specialty: {} } },
        timeBudgetEntries: [],
        calendarEntries: [],
        _count: { groupAssignments: 0, workingCurricula: 0 },
        sections: [
          {
            id: 'sec-1',
            versionId: 'ver-1',
            electiveBlocks: [],
            components: [
              { id: 'comp-1', sectionId: 'sec-1', terms: [] },
            ],
          },
        ],
      }
      prisma.curriculumVersion.findUnique.mockResolvedValue(version)
      prisma.curriculumComponentDisplayInSection.findMany.mockResolvedValue([])

      const result = await service.findById('ver-1')
      const comp = result.sections[0]!.components[0]!
      expect(comp.isProjected).toBe(false)
      expect(comp.countsInTotals).toBe(true)
      expect(comp.projectionId).toBeNull()
    })

    it('projected rows get countsInTotals = false and isProjected = true', async () => {
      const canonicalComponent = {
        id: 'comp-1',
        sectionId: 'sec-1',
        terms: [{ id: 't1', semesterNumber: 1, hours: 60 }],
      }
      const version = {
        id: 'ver-1',
        isPublished: false,
        curriculum: { program: { specialty: {} } },
        timeBudgetEntries: [],
        calendarEntries: [],
        _count: { groupAssignments: 0, workingCurricula: 0 },
        sections: [
          { id: 'sec-1', versionId: 'ver-1', electiveBlocks: [], components: [canonicalComponent] },
          { id: 'sec-2', versionId: 'ver-1', electiveBlocks: [], components: [] },
        ],
      }
      const projectionRow = {
        id: 'proj-1',
        componentId: 'comp-1',
        sectionId: 'sec-2',
        displayOrder: 0,
        displayMarker: '*',
        displayNote: null,
        component: canonicalComponent,
      }
      prisma.curriculumVersion.findUnique.mockResolvedValue(version)
      prisma.curriculumComponentDisplayInSection.findMany.mockResolvedValue([projectionRow])

      const result = await service.findById('ver-1')
      const sec2Components = result.sections[1]!.components
      expect(sec2Components).toHaveLength(1)
      const projected = sec2Components[0]!
      expect(projected.isProjected).toBe(true)
      expect(projected.countsInTotals).toBe(false)
      expect(projected.projectionId).toBe('proj-1')
      expect(projected.sourceSectionId).toBe('sec-1')
      expect(projected.displayMarker).toBe('*')

      // Canonical section still has only one component (no duplication)
      expect(result.sections[0]!.components).toHaveLength(1)
      expect(result.sections[0]!.components[0]!.countsInTotals).toBe(true)
    })
  })

  // ── Scenario 2: projections are same-version only ─────────────────────────

  describe('createProjection — same-version enforcement', () => {
    it('throws BadRequestException when component belongs to a different version', async () => {
      prisma.curriculumComponent.findUnique.mockResolvedValue(
        makeComponent({ id: 'comp-1', sectionId: 'sec-A', versionId: 'ver-OTHER' }),
      )

      await expect(
        service.createProjection('ver-1', {
          componentId: 'comp-1',
          targetSectionId: 'sec-2',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when target section belongs to a different version', async () => {
      prisma.curriculumComponent.findUnique.mockResolvedValue(
        makeComponent({ id: 'comp-1', sectionId: 'sec-1', versionId: 'ver-1' }),
      )
      prisma.curriculumSection.findUnique.mockResolvedValue({
        id: 'sec-2',
        versionId: 'ver-OTHER',
        version: makeDraftVersion({ id: 'ver-OTHER' }),
      })

      await expect(
        service.createProjection('ver-1', {
          componentId: 'comp-1',
          targetSectionId: 'sec-2',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('throws BadRequestException when target section equals primary section', async () => {
      const comp = makeComponent({ id: 'comp-1', sectionId: 'sec-1', versionId: 'ver-1' })
      prisma.curriculumComponent.findUnique.mockResolvedValue(comp)
      prisma.curriculumSection.findUnique.mockResolvedValue({
        id: 'sec-1',
        versionId: 'ver-1',
        version: makeDraftVersion(),
      })

      await expect(
        service.createProjection('ver-1', {
          componentId: 'comp-1',
          targetSectionId: 'sec-1', // same as primary
        }),
      ).rejects.toThrow(BadRequestException)
    })
  })

  // ── Scenario 3: published versions reject projection mutations ────────────

  describe('published version immutability', () => {
    it('createProjection throws when target section belongs to a published version', async () => {
      const comp = makeComponent({ id: 'comp-1', sectionId: 'sec-1', versionId: 'ver-1' })
      prisma.curriculumComponent.findUnique.mockResolvedValue(comp)
      prisma.curriculumSection.findUnique.mockResolvedValue({
        id: 'sec-2',
        versionId: 'ver-1',
        version: makePublishedVersion({ id: 'ver-1' }), // published!
      })

      await expect(
        service.createProjection('ver-1', {
          componentId: 'comp-1',
          targetSectionId: 'sec-2',
        }),
      ).rejects.toThrow(BadRequestException)
    })

    it('deleteProjection throws when canonical component belongs to a published version', async () => {
      const publishedVersion = makePublishedVersion({ id: 'ver-1' })
      const projection = {
        id: 'proj-1',
        componentId: 'comp-1',
        sectionId: 'sec-2',
        component: {
          id: 'comp-1',
          sectionId: 'sec-1',
          section: {
            id: 'sec-1',
            versionId: 'ver-1',
            version: publishedVersion,
          },
        },
      }
      prisma.curriculumComponentDisplayInSection.findUnique.mockResolvedValue(projection)

      await expect(service.deleteProjection('proj-1')).rejects.toThrow(BadRequestException)
      expect(prisma.curriculumComponentDisplayInSection.delete).not.toHaveBeenCalled()
    })
  })

  // ── Scenario 4: duplicateFrom copies projections with remapped IDs ────────

  describe('duplicateFrom — projection ID remapping', () => {
    it('re-creates projections with new component/section IDs', async () => {
      const sourceVersion = {
        id: 'ver-src',
        versionNumber: 1,
        approvalDate: new Date(),
        approvalOrderNumber: 'ord-1',
        approvedBy: 'user',
        notes: null,
        sections: [
          {
            id: 'sec-src-1',
            code: 'A',
            name: 'Section A',
            orderIndex: 0,
            sectionType: 'GENERAL_COMPETENCY' as const,
            subtotalEcts: null,
            electiveBlocks: [],
            components: [
              {
                id: 'comp-src-1',
                sectionId: 'sec-src-1',
                electiveBlockId: null,
                code: 'ОК1',
                name: 'Comp 1',
                componentType: 'DISCIPLINE' as const,
                componentKind: 'REGULAR' as const,
                totalEcts: '3',
                totalHours: 90,
                orderIndex: 0,
                isMandatory: true,
                practiceType: null,
                courseWorkCount: 0,
                courseProjectCount: 0,
                notes: null,
                auditoryHours: null,
                lectureHours: null,
                practicalHours: null,
                seminarHours: null,
                labHours: null,
                selfStudyHours: null,
                otherHours: null,
                znoPreparationHours: null,
                groupCode: null,
                terms: [],
              },
            ],
          },
          {
            id: 'sec-src-2',
            code: 'B',
            name: 'Section B',
            orderIndex: 1,
            sectionType: 'PROFESSIONAL_COMPETENCY' as const,
            subtotalEcts: null,
            electiveBlocks: [],
            components: [],
          },
        ],
        timeBudgetEntries: [],
        calendarEntries: [],
      }

      prisma.curriculumVersion.findUnique.mockResolvedValue(sourceVersion)
      prisma.curriculum.findUnique.mockResolvedValue({ id: 'curr-1' })
      prisma.curriculumVersion.findFirst.mockResolvedValue({ versionNumber: 1 })

      const newVersion = { id: 'ver-new', versionNumber: 2 }
      const newSec1 = { id: 'sec-new-1' }
      const newSec2 = { id: 'sec-new-2' }
      const newComp1 = { id: 'comp-new-1' }

      // The $transaction mock: we need full control over the transaction context
      const txMock = {
        curriculumVersion: { create: jest.fn().mockResolvedValue(newVersion) },
        curriculumSection: {
          create: jest.fn()
            .mockResolvedValueOnce(newSec1)
            .mockResolvedValueOnce(newSec2),
        },
        curriculumComponent: { create: jest.fn().mockResolvedValue(newComp1) },
        curriculumComponentTerm: { create: jest.fn() },
        curriculumComponentDisplayInSection: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'proj-src-1',
              componentId: 'comp-src-1',
              sectionId: 'sec-src-2',
              displayOrder: 0,
              displayMarker: '*',
              displayNote: null,
            },
          ]),
          create: jest.fn().mockResolvedValue({ id: 'proj-new-1' }),
        },
        electiveBlock: { create: jest.fn() },
        timeBudgetEntry: { create: jest.fn() },
        academicCalendarEntry: { create: jest.fn() },
      }
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock))

      await service.duplicateFrom('ver-src', 'curr-1')

      // Projection must be created with REMAPPED IDs
      expect(txMock.curriculumComponentDisplayInSection.create).toHaveBeenCalledTimes(1)
      expect(txMock.curriculumComponentDisplayInSection.create).toHaveBeenCalledWith({
        data: {
          componentId: 'comp-new-1',   // remapped from comp-src-1
          sectionId: 'sec-new-2',      // remapped from sec-src-2
          displayOrder: 0,
          displayMarker: '*',
          displayNote: null,
        },
      })
    })

    it('skips projections whose source IDs cannot be remapped (defensive)', async () => {
      const sourceVersion = {
        id: 'ver-src',
        versionNumber: 1,
        approvalDate: new Date(),
        approvalOrderNumber: 'ord-1',
        approvedBy: 'user',
        notes: null,
        sections: [],
        timeBudgetEntries: [],
        calendarEntries: [],
      }
      prisma.curriculumVersion.findUnique.mockResolvedValue(sourceVersion)
      prisma.curriculum.findUnique.mockResolvedValue({ id: 'curr-1' })
      prisma.curriculumVersion.findFirst.mockResolvedValue({ versionNumber: 1 })

      const txMock = {
        curriculumVersion: { create: jest.fn().mockResolvedValue({ id: 'ver-new' }) },
        curriculumSection: { create: jest.fn() },
        curriculumComponent: { create: jest.fn() },
        curriculumComponentTerm: { create: jest.fn() },
        curriculumComponentDisplayInSection: {
          findMany: jest.fn().mockResolvedValue([
            // Orphaned projection whose IDs don't map to anything in the source
            { id: 'proj-orphan', componentId: 'comp-ghost', sectionId: 'sec-ghost', displayOrder: 0, displayMarker: null, displayNote: null },
          ]),
          create: jest.fn(),
        },
        electiveBlock: { create: jest.fn() },
        timeBudgetEntry: { create: jest.fn() },
        academicCalendarEntry: { create: jest.fn() },
      }
      prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) => fn(txMock))

      await service.duplicateFrom('ver-src', 'curr-1')

      // create should NOT be called — no valid mapping
      expect(txMock.curriculumComponentDisplayInSection.create).not.toHaveBeenCalled()
    })
  })

  // ── Scenario 5: projected rows reuse canonical terms, no duplicates ────────

  describe('projected rows reuse canonical terms', () => {
    it('projected row carries the same term objects as the canonical component', async () => {
      const terms = [
        { id: 't1', semesterNumber: 1, hours: 60, ects: '2.0', controlForm: 'EXAM', hasCourseWork: false, hasCourseProject: false },
      ]
      const canonicalComponent = { id: 'comp-1', sectionId: 'sec-1', terms }
      const version = {
        id: 'ver-1',
        isPublished: false,
        curriculum: { program: { specialty: {} } },
        timeBudgetEntries: [],
        calendarEntries: [],
        _count: { groupAssignments: 0, workingCurricula: 0 },
        sections: [
          { id: 'sec-1', versionId: 'ver-1', electiveBlocks: [], components: [canonicalComponent] },
          { id: 'sec-2', versionId: 'ver-1', electiveBlocks: [], components: [] },
        ],
      }
      const projectionRow = {
        id: 'proj-1',
        componentId: 'comp-1',
        sectionId: 'sec-2',
        displayOrder: 0,
        displayMarker: null,
        displayNote: null,
        component: { ...canonicalComponent, terms }, // same terms, same IDs
      }
      prisma.curriculumVersion.findUnique.mockResolvedValue(version)
      prisma.curriculumComponentDisplayInSection.findMany.mockResolvedValue([projectionRow])

      const result = await service.findById('ver-1')

      const canonicalTerms = result.sections[0]!.components[0]!.terms
      const projectedTerms = result.sections[1]!.components[0]!.terms

      // Same term data — no new rows created, no new IDs
      expect(projectedTerms).toHaveLength(1)
      expect(projectedTerms[0]!.id).toBe(canonicalTerms[0]!.id)
      expect(projectedTerms[0]!.hours).toBe(60)

      // Projected row has the canonical component's ID — same entity, no DB duplicate
      expect(result.sections[1]!.components[0]!.id).toBe('comp-1')
    })
  })
})
