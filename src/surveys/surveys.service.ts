import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, SurveyStatus } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { activeStudentWhere } from '@/libs/common/active-student'
import { resolveOwnStudentId } from '@/libs/common/own-student'

import type {
  CreateSurveyDto,
  SetSurveyQuestionsDto,
  SubmitSurveyDto,
  UpdateSurveyDto,
} from './dto/survey-request.dto'
import type {
  StudentSurveyDto,
  SurveyAdminDto,
  SurveyQuestionDto,
  SurveyResultsDto,
} from './dto/survey-response.dto'
import { computeQuestionResults, computeResponseRatePercent } from './survey-results'

/** Prisma-select для адмін-подання кампанії. */
const ADMIN_INCLUDE = {
  questions: { orderBy: { order: 'asc' as const } },
  targetGroups: { include: { group: { select: { id: true, name: true } } } },
  _count: { select: { completions: true } },
} satisfies Prisma.SurveyInclude

type AdminRow = Prisma.SurveyGetPayload<{ include: typeof ADMIN_INCLUDE }>

@Injectable()
export class SurveysService {
  private readonly logger = new Logger(SurveysService.name)

  public constructor(private readonly prisma: PrismaService) {}

  // ── Admin: CRUD ────────────────────────────────────────────────────────────

  public async list(): Promise<SurveyAdminDto[]> {
    const rows = await this.prisma.survey.findMany({
      include: ADMIN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    })
    return rows.map((r) => this.toAdminDto(r))
  }

  public async get(id: string): Promise<SurveyAdminDto> {
    const row = await this.prisma.survey.findUnique({ where: { id }, include: ADMIN_INCLUDE })
    if (!row) throw new NotFoundException('Опитування не знайдено.')
    return this.toAdminDto(row)
  }

  public async create(dto: CreateSurveyDto, userId: string): Promise<SurveyAdminDto> {
    const row = await this.prisma.survey.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        isAnonymous: dto.isAnonymous ?? true,
        opensAt: dto.opensAt ? new Date(dto.opensAt) : null,
        closesAt: dto.closesAt ? new Date(dto.closesAt) : null,
        createdById: userId,
        targetGroups: dto.groupIds?.length
          ? { create: dto.groupIds.map((groupId) => ({ groupId })) }
          : undefined,
      },
      include: ADMIN_INCLUDE,
    })
    this.logger.log(`[Survey] created id=${row.id} by=${userId}`)
    return this.toAdminDto(row)
  }

  public async update(id: string, dto: UpdateSurveyDto): Promise<SurveyAdminDto> {
    const survey = await this.requireSurvey(id)
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException('Редагувати можна лише чернетку (DRAFT).')
    }

    const row = await this.prisma.$transaction(async (tx) => {
      if (dto.groupIds !== undefined) {
        await tx.surveyTargetGroup.deleteMany({ where: { surveyId: id } })
        if (dto.groupIds.length > 0) {
          await tx.surveyTargetGroup.createMany({
            data: dto.groupIds.map((groupId) => ({ surveyId: id, groupId })),
          })
        }
      }
      return tx.survey.update({
        where: { id },
        data: {
          title: dto.title,
          description: dto.description,
          isAnonymous: dto.isAnonymous,
          opensAt: dto.opensAt === undefined ? undefined : dto.opensAt ? new Date(dto.opensAt) : null,
          closesAt: dto.closesAt === undefined ? undefined : dto.closesAt ? new Date(dto.closesAt) : null,
        },
        include: ADMIN_INCLUDE,
      })
    })
    return this.toAdminDto(row)
  }

  /** Повна заміна набору питань (лише DRAFT — щоб не осиротити відповіді). */
  public async setQuestions(id: string, dto: SetSurveyQuestionsDto): Promise<SurveyAdminDto> {
    const survey = await this.requireSurvey(id)
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException('Питання можна змінювати лише в чернетці (DRAFT).')
    }

    const row = await this.prisma.$transaction(async (tx) => {
      await tx.surveyQuestion.deleteMany({ where: { surveyId: id } })
      if (dto.questions.length > 0) {
        await tx.surveyQuestion.createMany({
          data: dto.questions.map((q, idx) => ({
            surveyId: id,
            order: idx + 1,
            text: q.text,
            type: q.type,
            required: q.required ?? true,
          })),
        })
      }
      return tx.survey.findUniqueOrThrow({ where: { id }, include: ADMIN_INCLUDE })
    })
    return this.toAdminDto(row)
  }

  /** Переходи: DRAFT→OPEN (потрібно ≥1 питання), OPEN→CLOSED. Назад — заборонено. */
  public async setStatus(id: string, status: SurveyStatus): Promise<SurveyAdminDto> {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: { _count: { select: { questions: true } } },
    })
    if (!survey) throw new NotFoundException('Опитування не знайдено.')

    const allowed =
      (survey.status === SurveyStatus.DRAFT && status === SurveyStatus.OPEN) ||
      (survey.status === SurveyStatus.OPEN && status === SurveyStatus.CLOSED)
    if (!allowed) {
      throw new BadRequestException(`Перехід ${survey.status} → ${status} не дозволено.`)
    }
    if (status === SurveyStatus.OPEN && survey._count.questions === 0) {
      throw new BadRequestException('Не можна відкрити опитування без питань.')
    }

    const row = await this.prisma.survey.update({
      where: { id },
      data: { status },
      include: ADMIN_INCLUDE,
    })
    this.logger.log(`[Survey] id=${id} status ${survey.status} → ${status}`)
    return this.toAdminDto(row)
  }

  public async remove(id: string): Promise<void> {
    const survey = await this.requireSurvey(id)
    if (survey.status !== SurveyStatus.DRAFT) {
      throw new BadRequestException('Видалити можна лише чернетку (DRAFT).')
    }
    await this.prisma.survey.delete({ where: { id } })
  }

  // ── Admin: results ─────────────────────────────────────────────────────────

  public async getResults(id: string): Promise<SurveyResultsDto> {
    const survey = await this.prisma.survey.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { order: 'asc' } },
        targetGroups: { include: { group: { select: { id: true, name: true } } } },
        completions: { select: { student: { select: { groupId: true } } } },
      },
    })
    if (!survey) throw new NotFoundException('Опитування не знайдено.')

    // Текстові відповіді сортуються за id (uuid) — без часової кореляції для анонімних.
    const answers = await this.prisma.surveyAnswer.findMany({
      where: { question: { surveyId: id } },
      select: { questionId: true, ratingValue: true, boolValue: true, textValue: true },
      orderBy: { id: 'asc' },
    })

    const targetGroupIds = survey.targetGroups.map((t) => t.groupId)
    const targetWhere: Prisma.StudentWhereInput = {
      ...activeStudentWhere(),
      ...(targetGroupIds.length > 0 ? { groupId: { in: targetGroupIds } } : {}),
    }
    const totalTargets = await this.prisma.student.count({ where: targetWhere })

    // Per-group розбивка лише коли кампанія таргетована на конкретні групи.
    const byGroup = await Promise.all(
      survey.targetGroups.map(async (t) => {
        const targets = await this.prisma.student.count({
          where: { ...activeStudentWhere(), groupId: t.groupId },
        })
        const completions = survey.completions.filter(
          (c) => c.student.groupId === t.groupId,
        ).length
        return { groupId: t.group.id, groupName: t.group.name, targets, completions }
      }),
    )

    return {
      surveyId: survey.id,
      title: survey.title,
      isAnonymous: survey.isAnonymous,
      status: survey.status,
      totalTargets,
      totalCompletions: survey.completions.length,
      responseRatePercent: computeResponseRatePercent(totalTargets, survey.completions.length),
      byGroup,
      questions: computeQuestionResults(survey.questions, answers),
    }
  }

  // ── Student: available surveys + submit ────────────────────────────────────

  public async listMy(userId: string): Promise<StudentSurveyDto[]> {
    const studentId = await resolveOwnStudentId(this.prisma, userId)
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { groupId: true },
    })

    const now = new Date()
    const rows = await this.prisma.survey.findMany({
      where: {
        status: SurveyStatus.OPEN,
        AND: [
          { OR: [{ opensAt: null }, { opensAt: { lte: now } }] },
          { OR: [{ closesAt: null }, { closesAt: { gte: now } }] },
          {
            OR: [
              { targetGroups: { none: {} } },
              ...(student.groupId
                ? [{ targetGroups: { some: { groupId: student.groupId } } }]
                : []),
            ],
          },
        ],
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        completions: { where: { studentId }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      isAnonymous: r.isAnonymous,
      closesAt: r.closesAt?.toISOString() ?? null,
      completed: r.completions.length > 0,
      questions: r.questions.map((q) => this.toQuestionDto(q)),
    }))
  }

  public async submit(surveyId: string, dto: SubmitSurveyDto, userId: string): Promise<void> {
    const studentId = await resolveOwnStudentId(this.prisma, userId)
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { groupId: true },
    })

    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        questions: true,
        targetGroups: { select: { groupId: true } },
      },
    })
    if (!survey) throw new NotFoundException('Опитування не знайдено.')

    const now = new Date()
    if (survey.status !== SurveyStatus.OPEN) {
      throw new BadRequestException('Опитування не відкрите.')
    }
    if (survey.opensAt && survey.opensAt > now) {
      throw new BadRequestException('Опитування ще не почалося.')
    }
    if (survey.closesAt && survey.closesAt < now) {
      throw new BadRequestException('Опитування вже завершилося.')
    }
    const targeted =
      survey.targetGroups.length === 0 ||
      (student.groupId !== null &&
        survey.targetGroups.some((t) => t.groupId === student.groupId))
    if (!targeted) {
      throw new BadRequestException('Це опитування не адресоване вашій групі.')
    }

    // Валідація відповідей проти питань.
    const questionById = new Map(survey.questions.map((q) => [q.id, q]))
    const answeredIds = new Set<string>()
    for (const a of dto.answers) {
      const q = questionById.get(a.questionId)
      if (!q) throw new BadRequestException('Відповідь на невідоме питання.')
      if (answeredIds.has(a.questionId)) {
        throw new BadRequestException('Дублікат відповіді на питання.')
      }
      answeredIds.add(a.questionId)

      const hasValue =
        (q.type === 'RATING' && a.ratingValue !== undefined) ||
        (q.type === 'YES_NO' && a.boolValue !== undefined) ||
        (q.type === 'TEXT' && a.textValue !== undefined && a.textValue.trim() !== '')
      if (!hasValue) {
        throw new BadRequestException(`Відповідь на питання «${q.text}» не відповідає його типу.`)
      }
    }
    for (const q of survey.questions) {
      if (q.required && !answeredIds.has(q.id)) {
        throw new BadRequestException(`Питання «${q.text}» обовʼязкове.`)
      }
    }

    // Транзакція: completion (unique блокує повторне проходження) + відповіді.
    // Для анонімних кампаній studentId у відповідях НЕ зберігається.
    const answerStudentId = survey.isAnonymous ? null : studentId
    try {
      await this.prisma.$transaction([
        this.prisma.surveyCompletion.create({ data: { surveyId, studentId } }),
        this.prisma.surveyAnswer.createMany({
          data: dto.answers.map((a) => {
            const q = questionById.get(a.questionId)!
            return {
              questionId: a.questionId,
              studentId: answerStudentId,
              ratingValue: q.type === 'RATING' ? (a.ratingValue ?? null) : null,
              boolValue: q.type === 'YES_NO' ? (a.boolValue ?? null) : null,
              textValue: q.type === 'TEXT' ? (a.textValue?.trim() ?? null) : null,
            }
          }),
        }),
      ])
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('Ви вже проходили це опитування.')
      }
      throw err
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async requireSurvey(id: string) {
    const survey = await this.prisma.survey.findUnique({ where: { id } })
    if (!survey) throw new NotFoundException('Опитування не знайдено.')
    return survey
  }

  private toQuestionDto(q: {
    id: string
    order: number
    text: string
    type: SurveyQuestionDto['type']
    required: boolean
  }): SurveyQuestionDto {
    return { id: q.id, order: q.order, text: q.text, type: q.type, required: q.required }
  }

  private toAdminDto(r: AdminRow): SurveyAdminDto {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      status: r.status,
      isAnonymous: r.isAnonymous,
      opensAt: r.opensAt?.toISOString() ?? null,
      closesAt: r.closesAt?.toISOString() ?? null,
      questionCount: r.questions.length,
      completionCount: r._count.completions,
      targetGroups: r.targetGroups.map((t) => ({
        groupId: t.group.id,
        groupName: t.group.name,
      })),
      questions: r.questions.map((q) => this.toQuestionDto(q)),
      createdAt: r.createdAt.toISOString(),
    }
  }
}
