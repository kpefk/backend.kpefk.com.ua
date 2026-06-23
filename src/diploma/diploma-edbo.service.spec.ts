import { DiplomaEdboService } from './diploma-edbo.service'

/**
 * Матчинг шаблону диплома до акредитації ЄДЕБО. Ключовий кейс: шаблон без коду
 * спеціальності (лише назва, напр. «Компютерні науки» без апострофа) має
 * знаходити акредитацію за назвою.
 */
describe('DiplomaEdboService.findAccreditation', () => {
  const service = new DiplomaEdboService(
    null as never,
    null as never,
    null as never,
  )

  const rec = (over: {
    specialityId: number
    specialityName: string | null
    isCertificateExist?: boolean
    certificateNumber?: string | null
  }) =>
    ({
      isCertificateExist: over.isCertificateExist ?? true,
      specialityId: over.specialityId,
      specialityName: over.specialityName,
      certificateNumber: over.certificateNumber ?? '',
    }) as unknown as Parameters<typeof service.findAccreditation>[1][number]

  it('матч за назвою без коду, ігноруючи апостроф', () => {
    const records = [
      rec({ specialityId: 121, specialityName: 'Інженерія програмного забезпечення' }),
      rec({ specialityId: 122, specialityName: "Комп'ютерні науки", certificateNumber: 'CN-122' }),
    ]
    const hit = service.findAccreditation(
      { specialtyCode: null, specialtyName: 'Компютерні науки' },
      records,
    )
    expect(hit?.certificateNumber).toBe('CN-122')
  })

  it('матч за назвою з кодом-префіксом у назві запису', () => {
    const records = [
      rec({ specialityId: 122, specialityName: "122 Комп'ютерні науки", certificateNumber: 'CN-122' }),
    ]
    const hit = service.findAccreditation(
      { specialtyCode: null, specialtyName: 'Компютерні науки' },
      records,
    )
    expect(hit?.certificateNumber).toBe('CN-122')
  })

  it('матч за кодом спеціальності, коли він заданий у шаблоні', () => {
    const records = [
      rec({ specialityId: 122, specialityName: 'Інша назва', certificateNumber: 'CN-122' }),
    ]
    const hit = service.findAccreditation(
      { specialtyCode: '122', specialtyName: null },
      records,
    )
    expect(hit?.certificateNumber).toBe('CN-122')
  })

  it('ігнорує записи без діючого сертифіката', () => {
    const records = [
      rec({ specialityId: 122, specialityName: "Комп'ютерні науки", isCertificateExist: false }),
    ]
    const hit = service.findAccreditation(
      { specialtyCode: null, specialtyName: 'Компютерні науки' },
      records,
    )
    expect(hit).toBeUndefined()
  })

  it('повертає undefined, коли нічого не збігається', () => {
    const records = [rec({ specialityId: 35, specialityName: 'Філологія' })]
    const hit = service.findAccreditation(
      { specialtyCode: null, specialtyName: 'Компютерні науки' },
      records,
    )
    expect(hit).toBeUndefined()
  })
})
