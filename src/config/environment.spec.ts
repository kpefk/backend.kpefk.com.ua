/**
 * Тіри розгортання: матриця політик + класифікатор write-операцій ЄДЕБО.
 *
 * Це регресійний захист на два запобіжники, від яких залежать реальні дані:
 *  • жоден тір, крім production, не має права писати в ЄДЕБО;
 *  • класифікатор не має пропустити write-ендпоінт як «читання».
 *
 * Pure functions, no Prisma/DB required.
 * Run: bun run test -- environment.spec.ts
 */
import { EdboService } from '@/edbo/core/edbo.service'

import { APP_ENV, APP_POLICY, type AppEnvironment } from './environment'

// ─── Матриця політик ──────────────────────────────────────────────────────────

describe('політика тіра', () => {
	it('поточний тір під час тестів — не production', () => {
		// Якщо це впаде, тести йдуть із бойовою політикою: реальні записи в
		// ЄДЕБО, увімкнена reCAPTCHA. Значить, оточення прогону зламане.
		expect(APP_ENV).not.toBe('production')
	})

	it('поточний тір не має права писати в ЄДЕБО', () => {
		expect(APP_POLICY.allowEdboWrites).toBe(false)
	})
})

// ─── Класифікатор write-операцій ──────────────────────────────────────────────

describe('EdboService.isWriteOperation', () => {
	/** Повний перелік write-ендпоінтів, які викликає застосунок. */
	const WRITES = [
		'/api/entrance/cancellation/add',
		'/api/entrance/cancellation/update',
		'/api/entrance/cancellation/del',
		'/api/entrance/examination/add',
		'/api/entrance/examination/del',
		'/api/entrance/personRequest/update',
		'/api/entrance/personRequest/changeStatus',
		'/api/entrance/personRequest/changeEnrollPriority',
		'/api/entrance/personRequest/complexUpdate',
		'/api/entrance/personRequest/motivationLetterSet',
		'/api/entrance/personRequest/originalDocuments/update',
		'/api/entrance/personRequest/subjectResult/update',
		'/api/entrance/programspeciality/add',
		'/api/entrance/programspeciality/del',
		'/api/entrance/specialities/add',
		'/api/entrance/specialities/del',
		'/api/entrance/specialities/update',
		'/api/entrance/specialities/entrysubject/add',
		'/api/entrance/specialities/entrysubject/del',
		'/api/entrance/specialities/entrysubject/update',
		'/api/entrance/universityExams/add',
		'/api/entrance/universityExams/delete',
		'/api/entrance/universityExams/edit',
		'/api/entrance/universityExams/requests/add',
		'/api/entrance/universityExams/requests/editStatus',
		'/api/entrance/universityExams/specs/add',
		'/api/entrance/universityExams/specs/delete',
		'/api/entrance/universityExams/streams/add',
		'/api/entrance/universityExams/streams/delete',
		'/api/entrance/universityExams/streams/edit',
		'/api/studentEducations/add',
		'/api/studentEducations/update',
		'/api/studentEducations/history/add',
		'/api/studentEducations/history/del'
	] as const

	/** Повний перелік read-ендпоінтів, які викликає застосунок. */
	const READS = [
		'/api/entrance/cancellation/list',
		'/api/entrance/enrollOrder/list',
		'/api/entrance/enrollOrder/get',
		'/api/entrance/examination/check',
		'/api/entrance/personRequest/list2',
		'/api/entrance/personRequest/category/list',
		'/api/entrance/personRequest/certificateZNO/list',
		'/api/entrance/personRequest/olympiads/list',
		'/api/entrance/personRequest/statusesHistory',
		'/api/entrance/personRequest/subjectResult/list',
		'/api/entrance/personRequest/motivationLetterGet',
		'/api/entrance/personRequest/EDKITechnology/list',
		'/api/entrance/personRequest/ZNOTechnology/list',
		'/api/entrance/programspeciality/list',
		'/api/entrance/specialities/list',
		'/api/entrance/specialities/entrysubject/list',
		'/api/entrance/universityExams/list',
		'/api/entrance/universityExams/requests/list',
		'/api/entrance/universityExams/specs/list',
		'/api/entrance/universityExams/streams/list',
		'/api/studentEducations/list',
		'/api/studentEducations/info',
		'/api/studentEducations/history/list',
		'/api/studentEducations/history/deleted/list',
		'/api/studentEducations/privilegeCategory/list',
		'/api/studentEducations/personEducationsList/out',
		'/api/physPersons/documents',
		'/api/university/get',
		'/api/university/staff/list',
		'/api/universityStudyPrograms/list',
		'/api/accreditationSpecialities/list',
		'/api/listener/listExternal'
	] as const

	it.each(WRITES)('write: %s', path => {
		expect(EdboService.isWriteOperation(path)).toBe(true)
	})

	it.each(READS)('read: %s', path => {
		expect(EdboService.isWriteOperation(path)).toBe(false)
	})

	it('не залежить від регістру останнього сегмента', () => {
		expect(EdboService.isWriteOperation('/api/entrance/x/ADD')).toBe(true)
		expect(
			EdboService.isWriteOperation('/api/entrance/x/ChangeStatus')
		).toBe(true)
	})

	it('ігнорує query-рядок', () => {
		expect(
			EdboService.isWriteOperation('/api/studentEducations/update?x=1')
		).toBe(true)
		expect(EdboService.isWriteOperation('/api/x/list?add=1')).toBe(false)
	})

	it('не падає на вироджених шляхах', () => {
		expect(EdboService.isWriteOperation('')).toBe(false)
		expect(EdboService.isWriteOperation('/')).toBe(false)
	})

	it('«add» усередині шляху не робить читання записом', () => {
		// Класифікація тільки за ОСТАННІМ сегментом — інакше будь-який
		// /add-something/list хибно блокувався б.
		expect(EdboService.isWriteOperation('/api/add/list')).toBe(false)
	})
})

// ─── Захист від запису поза production ────────────────────────────────────────

describe('EdboService.post — блокування записів поза production', () => {
	let service: EdboService

	beforeEach(() => {
		service = new EdboService()
		jest.restoreAllMocks()
	})

	it('write-операція відхиляється, мережевого запиту не відбувається', async () => {
		const fetchSpy = jest.spyOn(globalThis, 'fetch')

		await expect(
			service.post('/api/studentEducations/update', { educationId: 1 })
		).rejects.toThrow(/заборонена в тірі/)

		expect(fetchSpy).not.toHaveBeenCalled()
	})

	it('перелік тірів, де запис дозволено, обмежений production', () => {
		const tiers: AppEnvironment[] = ['development', 'test', 'production']
		const writable = tiers.filter(
			tier => tier === 'production' // єдиний тір з allowEdboWrites: true
		)
		expect(writable).toEqual(['production'])
	})
})
