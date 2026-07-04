import { BadRequestException } from '@nestjs/common'
import { GradeScale, NationalGrade, TermControlForm } from '@prisma/client'

import { GradeScaleService } from './grade-scale.service'

describe('GradeScaleService', () => {
  const service = new GradeScaleService(null as never)

  describe('toNationalGrade — 12-point scale', () => {
    const scale = GradeScale.TWELVE_POINT
    const form = TermControlForm.EXAM

    it.each([
      [12, NationalGrade.EXCELLENT],
      [11, NationalGrade.EXCELLENT],
      [10, NationalGrade.EXCELLENT],
      [9, NationalGrade.GOOD],
      [7, NationalGrade.GOOD],
      [6, NationalGrade.SATISFACTORY],
      [4, NationalGrade.SATISFACTORY],
      [3, NationalGrade.UNSATISFACTORY],
      [1, NationalGrade.UNSATISFACTORY],
    ])('grade %i → %s', (grade, expected) => {
      expect(service.toNationalGrade(grade, scale, form)).toBe(expected)
    })
  })

  describe('toNationalGrade — 5-point scale', () => {
    const scale = GradeScale.FIVE_POINT
    const form = TermControlForm.GRADED_CREDIT

    it.each([
      [5, NationalGrade.EXCELLENT],
      [4, NationalGrade.GOOD],
      [3, NationalGrade.SATISFACTORY],
      [2, NationalGrade.UNSATISFACTORY],
      [1, NationalGrade.UNSATISFACTORY],
    ])('grade %i → %s', (grade, expected) => {
      expect(service.toNationalGrade(grade, scale, form)).toBe(expected)
    })
  })

  describe('toNationalGrade — CREDIT throws', () => {
    it('throws for CREDIT control form', () => {
      expect(() =>
        service.toNationalGrade(null, GradeScale.TWELVE_POINT, TermControlForm.CREDIT),
      ).toThrow(BadRequestException)
    })
  })

  describe('toNationalGrade — null grade for EXAM throws', () => {
    it('throws when grade is null for EXAM', () => {
      expect(() =>
        service.toNationalGrade(null, GradeScale.TWELVE_POINT, TermControlForm.EXAM),
      ).toThrow(BadRequestException)
    })
  })

  describe('validateGrade', () => {
    it('allows valid 12-point grade', () => {
      expect(() => service.validateGrade(10, GradeScale.TWELVE_POINT, TermControlForm.EXAM)).not.toThrow()
    })

    it('allows valid 5-point grade', () => {
      expect(() => service.validateGrade(4, GradeScale.FIVE_POINT, TermControlForm.GRADED_CREDIT)).not.toThrow()
    })

    it('rejects 12-point grade out of range', () => {
      expect(() => service.validateGrade(13, GradeScale.TWELVE_POINT, TermControlForm.EXAM)).toThrow(
        BadRequestException,
      )
      expect(() => service.validateGrade(0, GradeScale.TWELVE_POINT, TermControlForm.EXAM)).toThrow(
        BadRequestException,
      )
    })

    it('rejects 5-point grade out of range', () => {
      expect(() => service.validateGrade(6, GradeScale.FIVE_POINT, TermControlForm.EXAM)).toThrow(
        BadRequestException,
      )
    })

    it('rejects numeric grade for CREDIT', () => {
      expect(() => service.validateGrade(5, GradeScale.FIVE_POINT, TermControlForm.CREDIT)).toThrow(
        BadRequestException,
      )
    })

    it('allows null grade for CREDIT', () => {
      expect(() => service.validateGrade(null, GradeScale.FIVE_POINT, TermControlForm.CREDIT)).not.toThrow()
    })

    it('rejects null grade for EXAM', () => {
      expect(() => service.validateGrade(null, GradeScale.TWELVE_POINT, TermControlForm.EXAM)).toThrow(
        BadRequestException,
      )
    })
  })

  describe('validateCreditGrade', () => {
    it('allows PASSED', () => {
      expect(() => service.validateCreditGrade(NationalGrade.PASSED)).not.toThrow()
    })

    it('allows NOT_PASSED', () => {
      expect(() => service.validateCreditGrade(NationalGrade.NOT_PASSED)).not.toThrow()
    })

    it('rejects EXCELLENT', () => {
      expect(() => service.validateCreditGrade(NationalGrade.EXCELLENT)).toThrow(BadRequestException)
    })
  })
})
