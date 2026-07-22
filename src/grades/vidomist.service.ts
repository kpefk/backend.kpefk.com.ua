import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import {
	GradeScale,
	NationalGrade,
	SemesterGradeStatus,
	TermControlForm
} from '@prisma/client'
import {
	AlignmentType,
	BorderStyle,
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	VerticalAlign,
	WidthType
} from 'docx'

import { activeStudentWhere } from '@/libs/common/active-student'
import { PrismaService } from '@/prisma/prisma.service'

import { GradeScaleService } from './grade-scale.service'
import {
	computeGradeStats,
	formatCreditText,
	formatGradeText,
	ROMAN_NUMERALS,
	UA_MONTHS_GENITIVE,
	VIDOMIST_SUBTITLE
} from './vidomist.constants'

export interface VidomistResult {
	buffer: Buffer
	filename: string
}

interface VidomistStudentRow {
	index: number
	fullName: string
	gradeText: string
	finalGrade: number | null
	nationalGrade: NationalGrade
}

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: '000000' }
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER }
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 }
const HEADER_CELL_MARGINS = { top: 80, bottom: 80, left: 100, right: 100 }

const COL_NUM = 600
const COL_NAME = 4500
const COL_GRADE = 2200
const COL_SIGN = 1726
const TABLE_WIDTH = COL_NUM + COL_NAME + COL_GRADE + COL_SIGN // 9026

@Injectable()
export class VidomistService {
	private readonly logger = new Logger(VidomistService.name)

	public constructor(
		private readonly prisma: PrismaService,
		private readonly scaleService: GradeScaleService
	) {}

	public async generate(
		componentTermId: string,
		groupId: string,
		academicYear: string
	): Promise<VidomistResult> {
		const data = await this.gatherData(
			componentTermId,
			groupId,
			academicYear
		)
		const doc = this.buildDocument(data)
		const buffer = await Packer.toBuffer(doc)

		const safeName = data.subjectName.replace(/[<>:"/\\|?*]/g, '_')
		const filename = `Відомість_${safeName}_${data.groupName}.docx`

		return { buffer: buffer, filename }
	}

	// ── Data gathering ────────────────────────────────────────────────────────

	private async gatherData(
		componentTermId: string,
		groupId: string,
		academicYear: string
	) {
		const term =
			await this.prisma.curriculumComponentTerm.findUniqueOrThrow({
				where: { id: componentTermId },
				select: {
					controlForm: true,
					semesterNumber: true,
					hasCourseWork: true,
					hasCourseProject: true,
					component: {
						select: {
							name: true,
							code: true,
							section: {
								select: {
									sectionType: true,
									version: {
										select: {
											curriculum: {
												select: {
													program: {
														select: {
															specialty: {
																select: {
																	code: true,
																	name: true
																}
															}
														}
													}
												}
											}
										}
									}
								}
							}
						}
					}
				}
			})

		const group = await this.prisma.group.findUniqueOrThrow({
			where: { id: groupId },
			select: { name: true }
		})

		const gradeScale = this.scaleService.scaleFromSectionType(
			term.component.section.sectionType
		)
		const controlForm = term.controlForm ?? TermControlForm.EXAM

		const teacher =
			await this.prisma.teacherLoadSubjectAssignment.findFirst({
				where: { curriculumComponentTermId: componentTermId, groupId },
				select: {
					primaryTeacher: {
						select: {
							lastName: true,
							firstName: true,
							middleName: true
						}
					}
				}
			})

		const students = await this.prisma.student.findMany({
			where: { groupId, ...activeStudentWhere() },
			select: { id: true, personFIO: true },
			orderBy: { personFIO: 'asc' }
		})

		const grades = await this.prisma.semesterGrade.findMany({
			where: {
				curriculumComponentTermId: componentTermId,
				academicYear,
				status: SemesterGradeStatus.ACTIVE,
				studentId: { in: students.map(s => s.id) }
			}
		})
		const gradeByStudent = new Map(grades.map(g => [g.studentId, g]))

		const rows: VidomistStudentRow[] = students.map((s, idx) => {
			const g = gradeByStudent.get(s.id)
			if (!g) {
				return {
					index: idx + 1,
					fullName: s.personFIO,
					gradeText: '',
					finalGrade: null,
					nationalGrade: NationalGrade.UNSATISFACTORY
				}
			}

			const gradeText =
				controlForm === TermControlForm.CREDIT
					? formatCreditText(g.nationalGrade)
					: g.finalGrade !== null
						? formatGradeText(
								g.finalGrade,
								gradeScale,
								g.nationalGrade
							)
						: ''

			return {
				index: idx + 1,
				fullName: s.personFIO,
				gradeText,
				finalGrade: g.finalGrade,
				nationalGrade: g.nationalGrade
			}
		})

		const specialty =
			term.component.section.version.curriculum.program.specialty
		const teacherName = teacher?.primaryTeacher
			? [
					teacher.primaryTeacher.lastName,
					teacher.primaryTeacher.firstName,
					teacher.primaryTeacher.middleName
				]
					.filter(Boolean)
					.join(' ')
			: ''

		let subtitle: string
		if (term.hasCourseWork) {
			subtitle = 'курсової роботи'
		} else if (term.hasCourseProject) {
			subtitle = 'курсового проекту'
		} else {
			subtitle = VIDOMIST_SUBTITLE[controlForm] ?? 'СЕМЕСТРОВИХ ОЦІНОК'
		}

		return {
			groupName: group.name,
			specialtyCode: specialty.code,
			specialtyName: specialty.name,
			subjectName: term.component.name,
			semesterNumber: term.semesterNumber,
			academicYear,
			teacherName,
			controlForm,
			gradeScale,
			subtitle,
			rows
		}
	}

	// ── Document building ─────────────────────────────────────────────────────

	private buildDocument(data: {
		groupName: string
		specialtyCode: string
		specialtyName: string
		subjectName: string
		semesterNumber: number
		academicYear: string
		teacherName: string
		controlForm: TermControlForm
		gradeScale: GradeScale
		subtitle: string
		rows: VidomistStudentRow[]
	}): Document {
		const isCourseWork = data.subtitle !== 'СЕМЕСТРОВИХ ОЦІНОК'
		const today = new Date()

		const children: (Paragraph | Table)[] = [
			...this.buildHeader(data, isCourseWork),
			...this.buildMetadata(data, today),
			this.buildTable(data.rows),
			...this.buildFooter(data)
		]

		return new Document({
			sections: [
				{
					properties: {
						page: {
							size: { width: 11906, height: 16838 },
							margin: {
								top: 1440,
								right: 1440,
								bottom: 1440,
								left: 1440
							}
						}
					},
					children
				}
			]
		})
	}

	private buildHeader(
		data: { subtitle: string },
		isCourseWork: boolean
	): Paragraph[] {
		const paragraphs: Paragraph[] = [
			new Paragraph({
				alignment: AlignmentType.CENTER,
				spacing: { after: 40 },
				children: [
					new TextRun({
						text: 'Міністерство освіти і науки України',
						size: 24
					})
				]
			}),
			new Paragraph({
				alignment: AlignmentType.CENTER,
				spacing: { after: 0 },
				children: [
					new TextRun({
						text: 'ВСП “КОВЕЛЬСЬКИЙ ПРОМИСЛОВО-ЕКОНОМІЧНИЙ ФАХОВИЙ КОЛЕДЖ',
						bold: true,
						size: 24
					})
				]
			}),
			new Paragraph({
				alignment: AlignmentType.CENTER,
				spacing: { after: 240 },
				children: [
					new TextRun({
						text: 'ЛУЦЬКОГО НАЦІОНАЛЬНОГО ТЕХНІЧНОГО УНІВЕРСИТЕТУ”',
						bold: true,
						size: 24
					})
				]
			})
		]

		if (isCourseWork) {
			paragraphs.push(
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 40 },
					children: [
						new TextRun({
							text: `ВІДОМІСТЬ`,
							bold: true,
							size: 28
						})
					]
				}),
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 240 },
					children: [
						new TextRun({
							text: data.subtitle,
							bold: true,
							size: 24
						})
					]
				})
			)
		} else {
			paragraphs.push(
				new Paragraph({
					alignment: AlignmentType.CENTER,
					spacing: { after: 240 },
					children: [
						new TextRun({
							text: `ВІДОМІСТЬ ${data.subtitle}`,
							bold: true,
							size: 28
						})
					]
				})
			)
		}

		return paragraphs
	}

	private buildMetadata(
		data: {
			groupName: string
			specialtyCode: string
			specialtyName: string
			subjectName: string
			semesterNumber: number
			academicYear: string
			teacherName: string
		},
		today: Date
	): Paragraph[] {
		const roman =
			ROMAN_NUMERALS[data.semesterNumber] ?? String(data.semesterNumber)
		const day = String(today.getDate())
		const month = UA_MONTHS_GENITIVE[today.getMonth()]
		const year = today.getFullYear()

		return [
			new Paragraph({
				spacing: { after: 60 },
				children: [
					new TextRun({
						text: `Група ${data.groupName}  `,
						bold: true,
						size: 24
					}),
					new TextRun({
						text: `Спеціальність ${data.specialtyCode} ${data.specialtyName}`,
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { after: 60 },
				children: [
					new TextRun({
						text: 'Освітній компонент ',
						bold: true,
						size: 24
					}),
					new TextRun({ text: data.subjectName, size: 24 })
				]
			}),
			new Paragraph({
				spacing: { after: 60 },
				children: [
					new TextRun({
						text: `Семестр ${roman}  `,
						bold: true,
						size: 24
					}),
					new TextRun({ text: `${data.academicYear} н.р.`, size: 24 })
				]
			}),
			new Paragraph({
				spacing: { after: 60 },
				children: [
					new TextRun({ text: 'Викладач ', bold: true, size: 24 }),
					new TextRun({ text: data.teacherName, size: 24 })
				]
			}),
			new Paragraph({
				spacing: { after: 240 },
				children: [
					new TextRun({
						text: 'Дата проведення «',
						bold: true,
						size: 24
					}),
					new TextRun({ text: day, size: 24 }),
					new TextRun({ text: '» ', bold: true, size: 24 }),
					new TextRun({ text: `${month} ${year} р.`, size: 24 })
				]
			})
		]
	}

	private buildTable(rows: VidomistStudentRow[]): Table {
		const headerRow = new TableRow({
			tableHeader: true,
			children: [
				this.headerCell(COL_NUM, '№\nп/п'),
				this.headerCell(
					COL_NAME,
					'Прізвище, ім’я по-батькові студента'
				),
				this.headerCell(COL_GRADE, 'Оцінка'),
				this.headerCell(COL_SIGN, 'Підпис')
			]
		})

		const dataRows = rows.map(
			row =>
				new TableRow({
					children: [
						this.dataCell(
							COL_NUM,
							`${row.index}.`,
							AlignmentType.CENTER
						),
						this.dataCell(
							COL_NAME,
							row.fullName,
							AlignmentType.LEFT
						),
						this.dataCell(
							COL_GRADE,
							row.gradeText,
							AlignmentType.CENTER
						),
						this.dataCell(COL_SIGN, '', AlignmentType.LEFT)
					]
				})
		)

		return new Table({
			width: { size: TABLE_WIDTH, type: WidthType.DXA },
			columnWidths: [COL_NUM, COL_NAME, COL_GRADE, COL_SIGN],
			rows: [headerRow, ...dataRows]
		})
	}

	private headerCell(width: number, text: string): TableCell {
		return new TableCell({
			width: { size: width, type: WidthType.DXA },
			borders: BORDERS,
			margins: HEADER_CELL_MARGINS,
			verticalAlign: VerticalAlign.CENTER,
			children: [
				new Paragraph({
					alignment: AlignmentType.CENTER,
					children: [new TextRun({ text, bold: true, size: 24 })]
				})
			]
		})
	}

	private dataCell(
		width: number,
		text: string,
		alignment: (typeof AlignmentType)[keyof typeof AlignmentType]
	): TableCell {
		return new TableCell({
			width: { size: width, type: WidthType.DXA },
			borders: BORDERS,
			margins: CELL_MARGINS,
			verticalAlign: VerticalAlign.CENTER,
			children: [
				new Paragraph({
					alignment,
					children: [new TextRun({ text, size: 24 })]
				})
			]
		})
	}

	private buildFooter(data: {
		gradeScale: GradeScale
		controlForm: TermControlForm
		rows: VidomistStudentRow[]
	}): Paragraph[] {
		if (data.controlForm === TermControlForm.CREDIT) {
			return this.buildCreditFooter(data.rows)
		}

		const numericGrades = data.rows
			.filter(r => r.finalGrade !== null)
			.map(r => r.finalGrade!)
		const stats = computeGradeStats(numericGrades, data.gradeScale)

		const formatCount = (count: number, percent: string): string =>
			count === 0 ? '—   «—»' : `${count}   «${percent}»`

		return [
			new Paragraph({
				spacing: { after: 80, before: 240 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text:
							`К-сть «${stats.ranges[0].label}»  ${formatCount(stats.ranges[0].count, stats.ranges[0].percent)}\t` +
							`К-сть «${stats.ranges[2].label}»  ${formatCount(stats.ranges[2].count, stats.ranges[2].percent)}`,
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { after: 80 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text:
							`К-сть «${stats.ranges[1].label}»  ${formatCount(stats.ranges[1].count, stats.ranges[1].percent)}\t` +
							`К-сть «${stats.ranges[3].label}»  ${formatCount(stats.ranges[3].count, stats.ranges[3].percent)}`,
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { after: 80 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text: `Середній бал  ${stats.average}\tЯкісний показник  ${stats.qualityPercent}`,
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { after: 0, before: 360 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text: 'Зав.відділення\t___________________',
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { before: 360 },
				children: [
					new TextRun({
						text: 'Примітка: відомість має бути здана в навчальну частину до «___» ______________ 20___ р.',
						size: 24
					})
				]
			})
		]
	}

	private buildCreditFooter(rows: VidomistStudentRow[]): Paragraph[] {
		const passed = rows.filter(
			r => r.nationalGrade === NationalGrade.PASSED
		).length
		const notPassed = rows.filter(
			r => r.nationalGrade === NationalGrade.NOT_PASSED
		).length
		const total = rows.filter(r => r.gradeText !== '').length

		const pctPassed =
			total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '—'
		const pctNotPassed =
			total > 0 && notPassed > 0
				? `${((notPassed / total) * 100).toFixed(1)}%`
				: '—'

		return [
			new Paragraph({
				spacing: { after: 80, before: 240 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text:
							`К-сть «зараховано»  ${passed}   «${pctPassed}»\t` +
							`К-сть «не зараховано»  ${notPassed}   «${pctNotPassed}»`,
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { after: 0, before: 360 },
				tabStops: [{ type: 'left' as const, position: 5013 }],
				children: [
					new TextRun({
						text: 'Зав.відділення\t___________________',
						size: 24
					})
				]
			}),
			new Paragraph({
				spacing: { before: 360 },
				children: [
					new TextRun({
						text: 'Примітка: відомість має бути здана в навчальну частину до «___» ______________ 20___ р.',
						size: 24
					})
				]
			})
		]
	}
}
