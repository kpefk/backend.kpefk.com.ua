import { Injectable, NotFoundException } from '@nestjs/common'

import { DiplomaGrade, type Prisma } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

import { HONORS_EXCELLENT_RATIO } from './diploma.constants'
import { SetGradesDto, UpdateDiplomaDto } from './dto/diploma.dto'

type ComponentRow = Prisma.DiplomaComponentGetPayload<object>
type TemplateComponentRow = Prisma.DiplomaTemplateComponentGetPayload<object>

@Injectable()
export class DiplomaService {
  public constructor(private readonly prisma: PrismaService) {}

  /** Рядки знімка компонентів шаблону для набору дипломів (createMany data). */
  private snapshotRows(
    diplomaIds: string[],
    components: TemplateComponentRow[],
  ): Prisma.DiplomaComponentCreateManyInput[] {
    return diplomaIds.flatMap((diplomaId) =>
      components.map((c) => ({
        diplomaId,
        code: c.code,
        nameUk: c.nameUk,
        nameEn: c.nameEn,
        ects: c.ects,
        type: c.type,
        controlForm: c.controlForm,
        orderIndex: c.orderIndex,
      })),
    )
  }

  /**
   * Атомарно призначає `templateId` набору дипломів і перезаписує їхні компоненти
   * знімком зі шаблону — однією транзакцією (а не по транзакції на диплом).
   */
  private async reassignTemplate(
    diplomaIds: string[],
    templateId: string | null,
    components: TemplateComponentRow[],
  ): Promise<void> {
    if (diplomaIds.length === 0) return
    await this.prisma.$transaction([
      this.prisma.diploma.updateMany({
        where: { id: { in: diplomaIds } },
        data: { templateId },
      }),
      this.prisma.diplomaComponent.deleteMany({
        where: { diplomaId: { in: diplomaIds } },
      }),
      ...(components.length > 0
        ? [
            this.prisma.diplomaComponent.createMany({
              data: this.snapshotRows(diplomaIds, components),
            }),
          ]
        : []),
    ])
  }

  // ── Batches ────────────────────────────────────────────────────────────────

  public async listBatches() {
    const batches = await this.prisma.diplomaBatch.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        academicYear: true,
        sourceFileName: true,
        count: true,
        createdAt: true,
      },
    })
    return batches.map((b) => ({ ...b, createdAt: b.createdAt.toISOString() }))
  }

  // ── Grade sheet ────────────────────────────────────────────────────────────

  /**
   * Зведена відомість партії — ОКРЕМА відомість на кожну академічну групу
   * (studyGroupName). Стовпці кожної групи беруться з ОК дипломів САМЕ цієї групи,
   * тож набори ОК різних спеціальностей не перемішуються.
   */
  public async getGradeSheet(batchId: string) {
    const diplomas = await this.prisma.diploma.findMany({
      where: { batchId },
      orderBy: [{ studyGroupName: 'asc' }, { lastNameUk: 'asc' }, { firstNameUk: 'asc' }],
      select: {
        id: true,
        lastNameUk: true,
        firstNameUk: true,
        isHonors: true,
        status: true,
        studyGroupName: true,
        specialityName: true,
        templateId: true,
        components: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            code: true,
            nameUk: true,
            nameEn: true,
            ects: true,
            type: true,
            controlForm: true,
            orderIndex: true,
            grade: true,
          },
        },
      },
    })

    type Row = (typeof diplomas)[number]

    // Групуємо за назвою групи (null → «Без групи»).
    const byGroup = new Map<string, Row[]>()
    for (const d of diplomas) {
      const key = d.studyGroupName ?? '—'
      const list = byGroup.get(key)
      if (list) list.push(d)
      else byGroup.set(key, [d])
    }

    const groups = [...byGroup.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
      .map(([groupName, ds]) => {
        const reference = ds.find((d) => d.components.length > 0)?.components ?? []
        const columns = reference.map((c) => ({
          orderIndex: c.orderIndex,
          code: c.code,
          nameUk: c.nameUk,
          nameEn: c.nameEn,
          ects: c.ects === null ? null : Number(c.ects),
          type: c.type,
          controlForm: c.controlForm,
        }))
        const rows = ds.map((d) => ({
          diplomaId: d.id,
          lastNameUk: d.lastNameUk,
          firstNameUk: d.firstNameUk,
          isHonors: d.isHonors,
          status: d.status,
          studyGroupName: d.studyGroupName,
          grades: Object.fromEntries(
            d.components.map((c) => [c.orderIndex, { componentId: c.id, grade: c.grade }]),
          ) as Record<number, { componentId: string; grade: DiplomaGrade | null }>,
        }))
        return {
          groupName,
          specialityName: ds.find((d) => d.specialityName)?.specialityName ?? null,
          templateId: ds.find((d) => d.templateId)?.templateId ?? null,
          columns,
          rows,
        }
      })

    return { groups }
  }

  // ── Batch: apply template to all diplomas ─────────────────────────────────

  public async applyTemplateToBatch(
    batchId: string,
    templateId: string | null,
    groupName?: string,
  ): Promise<{ count: number }> {
    const diplomas = await this.prisma.diploma.findMany({
      where: { batchId, ...(groupName ? { studyGroupName: groupName } : {}) },
      select: { id: true },
    })

    const components = templateId
      ? await this.prisma.diplomaTemplateComponent.findMany({
          where: { templateId },
          orderBy: { orderIndex: 'asc' },
        })
      : []

    await this.reassignTemplate(
      diplomas.map((d) => d.id),
      templateId,
      components,
    )

    return { count: diplomas.length }
  }

  // ── Batch: delete ─────────────────────────────────────────────────────────

  public async deleteBatch(id: string): Promise<void> {
    const batch = await this.prisma.diplomaBatch.findUnique({ where: { id } })
    if (!batch) throw new NotFoundException('Партію не знайдено.')

    await this.prisma.diplomaComponent.deleteMany({
      where: { diploma: { batchId: id } },
    })
    await this.prisma.diploma.deleteMany({ where: { batchId: id } })
    await this.prisma.diplomaBatch.delete({ where: { id } })
  }

  // ── Diplomas list ──────────────────────────────────────────────────────────

  public async listDiplomas(batchId?: string) {
    const diplomas = await this.prisma.diploma.findMany({
      where: batchId ? { batchId } : undefined,
      orderBy: [{ lastNameUk: 'asc' }, { firstNameUk: 'asc' }],
      select: {
        id: true,
        lastNameUk: true,
        firstNameUk: true,
        documentSeries: true,
        documentNumber: true,
        specialityName: true,
        studyGroupName: true,
        status: true,
        isHonors: true,
        templateId: true,
        template: { select: { id: true, name: true, variant: true } },
        _count: { select: { components: true } },
      },
    })
    return diplomas.map((d) => ({
      id: d.id,
      lastNameUk: d.lastNameUk,
      firstNameUk: d.firstNameUk,
      documentSeries: d.documentSeries,
      documentNumber: d.documentNumber,
      specialityName: d.specialityName,
      studyGroupName: d.studyGroupName,
      status: d.status,
      isHonors: d.isHonors,
      template: d.template,
      componentCount: d._count.components,
    }))
  }

  // ── Single diploma ─────────────────────────────────────────────────────────

  public async getDiploma(id: string) {
    const d = await this.prisma.diploma.findUnique({
      where: { id },
      include: {
        components: { orderBy: { orderIndex: 'asc' } },
        template: { select: { id: true, name: true, variant: true } },
      },
    })
    if (!d) throw new NotFoundException('Диплом не знайдено.')

    const components = d.components.map((c) => ({
      id: c.id,
      code: c.code,
      nameUk: c.nameUk,
      nameEn: c.nameEn,
      ects: c.ects === null ? null : Number(c.ects),
      type: c.type,
      orderIndex: c.orderIndex,
      grade: c.grade,
    }))

    return {
      id: d.id,
      batchId: d.batchId,
      template: d.template,
      lastNameUk: d.lastNameUk,
      firstNameUk: d.firstNameUk,
      lastNameEn: d.lastNameEn,
      firstNameEn: d.firstNameEn,
      birthday: d.birthday?.toISOString() ?? null,
      edeboPersonCode: d.edeboPersonCode,
      personEducationId: d.personEducationId,
      documentSeries: d.documentSeries,
      documentNumber: d.documentNumber,
      supplementId: d.supplementId,
      graduateDate: d.graduateDate?.toISOString() ?? null,
      issueDate: d.issueDate?.toISOString() ?? null,
      specialityName: d.specialityName,
      specialityNameEn: d.specialityNameEn,
      qualificationName: d.qualificationName,
      studyProgramName: d.studyProgramName,
      studyGroupName: d.studyGroupName,
      bossFio: d.bossFio,
      bossPost: d.bossPost,
      qualificationWorkTitleUk: d.qualificationWorkTitleUk,
      qualificationWorkTitleEn: d.qualificationWorkTitleEn,
      isHonors: d.isHonors,
      honorsSuggested: this.computeHonors(d.components),
      status: d.status,
      totalEcts: this.totalEcts(d.components),
      components,
    }
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  public async update(id: string, dto: UpdateDiplomaDto) {
    const existing = await this.prisma.diploma.findUnique({
      where: { id },
      select: { templateId: true },
    })
    if (!existing) throw new NotFoundException('Диплом не знайдено.')

    // Зміна шаблону → знімок компонентів заново (оцінки скидаються).
    const templateChanged =
      dto.templateId !== undefined && dto.templateId !== existing.templateId

    await this.prisma.$transaction(async (tx) => {
      await tx.diploma.update({
        where: { id },
        data: {
          templateId: dto.templateId,
          qualificationWorkTitleUk: dto.qualificationWorkTitleUk,
          qualificationWorkTitleEn: dto.qualificationWorkTitleEn,
          isHonors: dto.isHonors,
          status: dto.status,
        },
      })

      if (templateChanged) {
        await tx.diplomaComponent.deleteMany({ where: { diplomaId: id } })
        if (dto.templateId) {
          const components = await tx.diplomaTemplateComponent.findMany({
            where: { templateId: dto.templateId },
            orderBy: { orderIndex: 'asc' },
          })
          if (components.length > 0) {
            await tx.diplomaComponent.createMany({
              data: components.map((c) => ({
                diplomaId: id,
                code: c.code,
                nameUk: c.nameUk,
                nameEn: c.nameEn,
                ects: c.ects,
                type: c.type,
                controlForm: c.controlForm,
                orderIndex: c.orderIndex,
              })),
            })
          }
        }
      }
    })

    return this.getDiploma(id)
  }

  // ── Assign template (опційно на всю групу) ──────────────────────────────────

  /**
   * Призначає шаблон диплому. applyToGroup=true → усім дипломам тієї ж групи
   * (studyGroupName) у партії. Компоненти знімаються заново зі шаблону.
   */
  public async assignTemplate(
    id: string,
    templateId: string | null,
    applyToGroup: boolean,
  ): Promise<{ count: number }> {
    const d = await this.prisma.diploma.findUnique({
      where: { id },
      select: { batchId: true, studyGroupName: true },
    })
    if (!d) throw new NotFoundException('Диплом не знайдено.')

    let targetIds: string[]
    if (applyToGroup && d.batchId && d.studyGroupName) {
      const group = await this.prisma.diploma.findMany({
        where: { batchId: d.batchId, studyGroupName: d.studyGroupName },
        select: { id: true },
      })
      targetIds = group.map((g) => g.id)
    } else {
      targetIds = [id]
    }

    const components = templateId
      ? await this.prisma.diplomaTemplateComponent.findMany({
          where: { templateId },
          orderBy: { orderIndex: 'asc' },
        })
      : []

    await this.reassignTemplate(targetIds, templateId, components)

    return { count: targetIds.length }
  }

  // ── Grades ─────────────────────────────────────────────────────────────────

  public async setGrades(id: string, dto: SetGradesDto) {
    const diploma = await this.prisma.diploma.findUnique({
      where: { id },
      select: { id: true, components: { select: { id: true } } },
    })
    if (!diploma) throw new NotFoundException('Диплом не знайдено.')
    const ownIds = new Set(diploma.components.map((c) => c.id))

    await this.prisma.$transaction(
      dto.grades
        .filter((g) => ownIds.has(g.componentId))
        .map((g) =>
          this.prisma.diplomaComponent.update({
            where: { id: g.componentId },
            data: { grade: g.grade ?? null },
          }),
        ),
    )

    // Авто-оновлення відзнаки за новими оцінками.
    const components = await this.prisma.diplomaComponent.findMany({
      where: { diplomaId: id },
    })
    await this.prisma.diploma.update({
      where: { id },
      data: { isHonors: this.computeHonors(components) },
    })

    return this.getDiploma(id)
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private totalEcts(components: ComponentRow[]): number {
    return components.reduce((sum, c) => sum + (c.ects === null ? 0 : Number(c.ects)), 0)
  }

  /**
   * §4.5: диплом з відзнакою — ≥75% «Відмінно» серед оцінюваних ОК (за шкалою),
   * без «Задовільно», а підсумкова атестація — «Відмінно».
   * «Зараховано» (PASSED) у відсотку не враховується.
   */
  private computeHonors(components: ComponentRow[]): boolean {
    const scaled = components.filter(
      (c) =>
        c.grade === DiplomaGrade.EXCELLENT ||
        c.grade === DiplomaGrade.GOOD ||
        c.grade === DiplomaGrade.SATISFACTORY,
    )
    if (scaled.length === 0) return false
    if (scaled.some((c) => c.grade === DiplomaGrade.SATISFACTORY)) return false

    const excellent = scaled.filter((c) => c.grade === DiplomaGrade.EXCELLENT).length
    if (excellent / scaled.length < HONORS_EXCELLENT_RATIO) return false

    const attestations = components.filter((c) => c.type === 'ATTESTATION' && c.grade)
    if (attestations.some((c) => c.grade !== DiplomaGrade.EXCELLENT)) return false

    return true
  }
}
