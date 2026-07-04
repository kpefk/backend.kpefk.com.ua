import { BadRequestException, Injectable } from '@nestjs/common'
import {
  type CurriculumSectionType,
  GradeScale,
  NationalGrade,
  TermControlForm,
} from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import {
  FIVE_POINT_MAX,
  FIVE_POINT_MIN,
  SECTION_TO_SCALE,
  TWELVE_POINT_MAX,
  TWELVE_POINT_MIN,
} from './grades.constants'

@Injectable()
export class GradeScaleService {
  public constructor(private readonly prisma: PrismaService) {}

  /**
   * Визначає шкалу оцінювання для компонента навчального плану.
   * Йде по ланцюжку: CurriculumComponentTerm → CurriculumComponent → CurriculumSection.sectionType.
   */
  public async resolveScale(componentTermId: string): Promise<GradeScale> {
    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: componentTermId },
      select: {
        component: {
          select: {
            section: { select: { sectionType: true } },
          },
        },
      },
    })

    return this.scaleFromSectionType(term.component.section.sectionType)
  }

  /** Маппінг CurriculumSectionType → GradeScale. */
  public scaleFromSectionType(sectionType: CurriculumSectionType): GradeScale {
    return SECTION_TO_SCALE[sectionType]
  }

  /**
   * Конвертує числову оцінку в національну текстову шкалу.
   * Для CREDIT: grade має бути null, nationalGrade вводиться напряму (PASSED/NOT_PASSED).
   */
  public toNationalGrade(
    grade: number | null,
    scale: GradeScale,
    controlForm: TermControlForm,
  ): NationalGrade {
    if (controlForm === TermControlForm.CREDIT) {
      throw new BadRequestException(
        'Для заліку національна оцінка (PASSED/NOT_PASSED) вказується безпосередньо',
      )
    }

    if (grade === null) {
      throw new BadRequestException("Числова оцінка обов'язкова для іспиту/диф. заліку")
    }

    if (scale === GradeScale.TWELVE_POINT) {
      return this.twelvePointToNational(grade)
    }
    return this.fivePointToNational(grade)
  }

  /** Валідує оцінку відносно шкали та форми контролю. */
  public validateGrade(
    grade: number | null,
    scale: GradeScale,
    controlForm: TermControlForm,
  ): void {
    if (controlForm === TermControlForm.CREDIT) {
      if (grade !== null) {
        throw new BadRequestException('Залік не має числової оцінки — тільки Зараховано/Не зараховано')
      }
      return
    }

    if (grade === null) {
      throw new BadRequestException("Числова оцінка обов'язкова для іспиту/диф. заліку")
    }

    if (!Number.isInteger(grade)) {
      throw new BadRequestException('Оцінка має бути цілим числом')
    }

    const [min, max] =
      scale === GradeScale.TWELVE_POINT
        ? [TWELVE_POINT_MIN, TWELVE_POINT_MAX]
        : [FIVE_POINT_MIN, FIVE_POINT_MAX]

    if (grade < min || grade > max) {
      throw new BadRequestException(
        `Оцінка має бути від ${min} до ${max} для ${scale === GradeScale.TWELVE_POINT ? '12-бальної' : '5-бальної'} шкали`,
      )
    }
  }

  /** Валідує nationalGradeOverride для CREDIT. */
  public validateCreditGrade(nationalGrade: NationalGrade): void {
    if (nationalGrade !== NationalGrade.PASSED && nationalGrade !== NationalGrade.NOT_PASSED) {
      throw new BadRequestException('Для заліку допустимі лише PASSED або NOT_PASSED')
    }
  }

  private twelvePointToNational(grade: number): NationalGrade {
    if (grade >= 10) return NationalGrade.EXCELLENT
    if (grade >= 7) return NationalGrade.GOOD
    if (grade >= 4) return NationalGrade.SATISFACTORY
    return NationalGrade.UNSATISFACTORY
  }

  private fivePointToNational(grade: number): NationalGrade {
    if (grade >= 5) return NationalGrade.EXCELLENT
    if (grade >= 4) return NationalGrade.GOOD
    if (grade >= 3) return NationalGrade.SATISFACTORY
    return NationalGrade.UNSATISFACTORY
  }
}
