import { Injectable, Logger } from '@nestjs/common'
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import { AttendanceStatus } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'
import { activeStudentWhere } from '@/libs/common/active-student'

export interface JournalResult {
  buffer: Buffer
  filename: string
}

interface SessionColumn {
  sessionId: string
  date: Date
  dateLabel: string
}

interface StudentRow {
  studentId: string
  fullName: string
  cells: Map<string, string>
}

interface LessonRow {
  index: number
  dateLabel: string
  topic: string
}

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
const CELL_PAD = { top: 40, bottom: 40, left: 60, right: 60 }

const MAX_DATE_COLS = 18

const UA_MONTHS_SHORT = [
  'І', 'ІІ', 'ІІІ', 'ІV', 'V', 'VІ',
  'VІІ', 'VІІІ', 'ІХ', 'Х', 'ХІ', 'ХІІ',
] as const

@Injectable()
export class JournalService {
  private readonly logger = new Logger(JournalService.name)

  public constructor(private readonly prisma: PrismaService) {}

  public async generate(
    componentTermId: string,
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ): Promise<JournalResult> {
    const data = await this.gatherData(componentTermId, groupId, academicYear, semesterNumber)
    const doc = this.buildDocument(data)
    const buffer = await Packer.toBuffer(doc)

    const safeName = data.subjectName.replace(/[<>:"/\\|?*]/g, '_')
    const filename = `Журнал_${safeName}_${data.groupName}.docx`

    return { buffer: buffer as Buffer, filename }
  }

  private async gatherData(
    componentTermId: string,
    groupId: string,
    academicYear: string,
    semesterNumber: number,
  ) {
    const term = await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
      where: { id: componentTermId },
      select: { component: { select: { name: true } } },
    })

    const group = await this.prisma.group.findUniqueOrThrow({
      where: { id: groupId },
      select: { name: true },
    })

    const sessions = await this.prisma.lessonSession.findMany({
      where: {
        curriculumComponentTermId: componentTermId,
        groupId,
        academicYear,
        semesterNumber,
        deletedAt: null,
      },
      select: {
        id: true,
        date: true,
        topic: true,
        teacher: { select: { lastName: true, firstName: true, middleName: true } },
      },
      orderBy: [{ date: 'asc' }, { slotNumber: 'asc' }],
    })

    const sessionIds = sessions.map((s) => s.id)

    const students = await this.prisma.student.findMany({
      where: { groupId, ...activeStudentWhere() },
      select: { id: true, personFIO: true },
      orderBy: { personFIO: 'asc' },
    })

    const records = await this.prisma.attendanceRecord.findMany({
      where: { lessonSessionId: { in: sessionIds } },
      select: { lessonSessionId: true, studentId: true, status: true, grade: true },
    })

    const columns: SessionColumn[] = sessions.map((s) => {
      const d = new Date(s.date)
      return {
        sessionId: s.id,
        date: d,
        dateLabel: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`,
      }
    })

    const recordMap = new Map<string, { status: AttendanceStatus; grade: number | null }>()
    for (const r of records) {
      recordMap.set(`${r.lessonSessionId}:${r.studentId}`, { status: r.status, grade: r.grade })
    }

    const studentRows: StudentRow[] = students.map((s) => {
      const cells = new Map<string, string>()
      for (const col of columns) {
        const key = `${col.sessionId}:${s.id}`
        const rec = recordMap.get(key)
        if (!rec) {
          cells.set(col.sessionId, '')
        } else if (rec.grade !== null) {
          cells.set(col.sessionId, String(rec.grade))
        } else if (rec.status === AttendanceStatus.ABSENT) {
          cells.set(col.sessionId, 'н')
        } else if (rec.status === AttendanceStatus.LATE) {
          cells.set(col.sessionId, 'зп')
        } else {
          cells.set(col.sessionId, '')
        }
      }
      return { studentId: s.id, fullName: s.personFIO, cells }
    })

    const lessonRows: LessonRow[] = sessions.map((s, idx) => {
      const d = new Date(s.date)
      return {
        index: idx + 1,
        dateLabel: `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`,
        topic: s.topic ?? '',
      }
    })

    const teacherName = sessions[0]?.teacher
      ? [sessions[0].teacher.lastName, sessions[0].teacher.firstName, sessions[0].teacher.middleName]
          .filter(Boolean)
          .join(' ')
      : ''

    return {
      subjectName: term.component.name,
      groupName: group.name,
      teacherName,
      columns,
      studentRows,
      lessonRows,
    }
  }

  // ── Document building ─────────────────────────────────────────────────────

  private buildDocument(data: {
    subjectName: string
    groupName: string
    teacherName: string
    columns: SessionColumn[]
    studentRows: StudentRow[]
    lessonRows: LessonRow[]
  }): Document {
    const sections = []

    const chunks = this.chunkColumns(data.columns, MAX_DATE_COLS)
    for (const chunk of chunks) {
      sections.push({
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          ...this.buildMatrixHeader(data.subjectName),
          this.buildMatrixTable(chunk, data.studentRows),
        ],
      })
    }

    sections.push({
      properties: {
        page: {
          size: {
            width: 11906,
            height: 16838,
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        ...this.buildContentHeader(data.teacherName),
        this.buildContentTable(data.lessonRows),
      ],
    })

    return new Document({ sections })
  }

  private chunkColumns(columns: SessionColumn[], size: number): SessionColumn[][] {
    const result: SessionColumn[][] = []
    for (let i = 0; i < columns.length; i += size) {
      result.push(columns.slice(i, i + size))
    }
    if (result.length === 0) result.push([])
    return result
  }

  // ── Matrix page (left page of spread) ─────────────────────────────────────

  private buildMatrixHeader(subjectName: string): Paragraph[] {
    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({ text: subjectName, size: 22, italics: true }),
          new TextRun({ text: '                    ', size: 22 }),
          new TextRun({
            text: 'II. Облік навчальних досягнень учнів',
            bold: true,
            size: 24,
          }),
        ],
      }),
    ]
  }

  private buildMatrixTable(
    columns: SessionColumn[],
    studentRows: StudentRow[],
  ): Table {
    const contentWidth = 16838 - 720 * 2 // landscape A4 content width = 15398
    const colNum = 500
    const colName = 4200
    const dateColsWidth = contentWidth - colNum - colName
    const dateColWidth = columns.length > 0
      ? Math.floor(dateColsWidth / Math.max(columns.length, 1))
      : 500
    const actualDateWidth = Math.min(dateColWidth, 700)

    const columnWidths = [colNum, colName, ...columns.map(() => actualDateWidth)]
    const tableWidth = colNum + colName + columns.length * actualDateWidth

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        this.matrixCell(colNum, '№\nз/п', true, AlignmentType.CENTER),
        this.matrixCell(colName, 'Прізвище\nта ім\'я учня\n(учениці)', true, AlignmentType.CENTER),
        ...columns.map((c) =>
          this.matrixCell(actualDateWidth, c.dateLabel, true, AlignmentType.CENTER),
        ),
      ],
    })

    const dataRows = studentRows.map((s, idx) =>
      new TableRow({
        children: [
          this.matrixCell(colNum, `${idx + 1}.`, false, AlignmentType.CENTER),
          this.matrixCell(colName, s.fullName, false, AlignmentType.LEFT),
          ...columns.map((c) =>
            this.matrixCell(
              actualDateWidth,
              s.cells.get(c.sessionId) ?? '',
              false,
              AlignmentType.CENTER,
            ),
          ),
        ],
      }),
    )

    return new Table({
      width: { size: tableWidth, type: WidthType.DXA },
      columnWidths,
      rows: [headerRow, ...dataRows],
    })
  }

  private matrixCell(
    width: number,
    text: string,
    bold: boolean,
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  ): TableCell {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: BORDERS,
      margins: CELL_PAD,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment,
          children: [new TextRun({ text, bold, size: 18 })],
        }),
      ],
    })
  }

  // ── Content page (right page of spread) ───────────────────────────────────

  private buildContentHeader(teacherName: string): Paragraph[] {
    return [
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({ text: 'Вчитель ', bold: true, size: 24 }),
          new TextRun({ text: teacherName, size: 24, underline: {} }),
        ],
      }),
    ]
  }

  private buildContentTable(lessonRows: LessonRow[]): Table {
    const contentWidth = 16838 - 720 * 2 // 15398
    const colIdx = 600
    const colDate = 1400
    const colHomework = 3000
    const colContent = contentWidth - colIdx - colDate - colHomework
    const columnWidths = [colIdx, colDate, colContent, colHomework]

    const headerRow = new TableRow({
      tableHeader: true,
      children: [
        this.contentCell(colIdx, '№\nз/п', true, AlignmentType.CENTER),
        this.contentCell(colDate, 'Дата', true, AlignmentType.CENTER),
        this.contentCell(colContent, 'ЗМІСТ', true, AlignmentType.CENTER),
        this.contentCell(colHomework, 'Завдання додому', true, AlignmentType.CENTER),
      ],
    })

    const dataRows = lessonRows.map((r) =>
      new TableRow({
        children: [
          this.contentCell(colIdx, `${r.index}.`, false, AlignmentType.CENTER),
          this.contentCell(colDate, r.dateLabel, false, AlignmentType.CENTER),
          this.contentCell(colContent, r.topic, false, AlignmentType.LEFT),
          this.contentCell(colHomework, '', false, AlignmentType.LEFT),
        ],
      }),
    )

    const minRows = Math.max(15, lessonRows.length)
    const emptyRows: TableRow[] = []
    for (let i = lessonRows.length; i < minRows; i++) {
      emptyRows.push(
        new TableRow({
          children: [
            this.contentCell(colIdx, '', false, AlignmentType.CENTER),
            this.contentCell(colDate, '', false, AlignmentType.CENTER),
            this.contentCell(colContent, '', false, AlignmentType.LEFT),
            this.contentCell(colHomework, '', false, AlignmentType.LEFT),
          ],
        }),
      )
    }

    return new Table({
      width: { size: contentWidth, type: WidthType.DXA },
      columnWidths,
      rows: [headerRow, ...dataRows, ...emptyRows],
    })
  }

  private contentCell(
    width: number,
    text: string,
    bold: boolean,
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  ): TableCell {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: BORDERS,
      margins: CELL_PAD,
      verticalAlign: VerticalAlign.CENTER,
      children: [
        new Paragraph({
          alignment,
          children: [new TextRun({ text, bold, size: 20 })],
        }),
      ],
    })
  }
}
