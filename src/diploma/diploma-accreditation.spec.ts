import { DiplomaGeneratorService, type DiplomaRow } from './diploma-generator.service'

/**
 * Форматування рядка сертифіката про акредитацію та дат (DD/MM/YYYY).
 */
describe('DiplomaGeneratorService — акредитація у buildData', () => {
  const service = new DiplomaGeneratorService(null as never)

  const build = (template: Record<string, unknown>) =>
    service.buildData({ components: [], template } as unknown as DiplomaRow)

  it('композитний {accreditationText} з датою DD/MM/YYYY', () => {
    const data = build({
      accrCertSeries: 'ДС',
      accrCertNumber: '006743',
      accrInstitutionName: 'Державною службою якості освіти України',
      accrProtocolNumber: '13',
      accrCertDate: '2025-12-08T00:00:00+02:00',
    })
    expect(data.accreditationText).toBe(
      'Сертифікат про акредитацію серія ДС № 006743, виданий ' +
        'Державною службою якості освіти України (протокол № 13 від 08/12/2025)',
    )
    expect(data.accrCertDate).toBe('08/12/2025')
  })

  it('ISO з часовою зоною не зміщує день (+03:00)', () => {
    const data = build({ accrCertDate: '2021-04-21T00:00:00+03:00' })
    expect(data.accrCertDate).toBe('21/04/2021')
  })

  it('опускає порожні протокол/дату без «протокол №  від»', () => {
    const data = build({
      accrCertSeries: 'ДС',
      accrCertNumber: '006743',
      accrInstitutionName: 'Державною службою якості освіти України',
    })
    expect(data.accreditationText).toBe(
      'Сертифікат про акредитацію серія ДС № 006743, виданий ' +
        'Державною службою якості освіти України',
    )
  })

  it('порожня акредитація → порожній рядок', () => {
    expect(build({}).accreditationText).toBe('')
  })

  it('приймає формат DD.MM.YYYY', () => {
    const data = build({ accrCertDate: '08.12.2025' })
    expect(data.accrCertDate).toBe('08/12/2025')
  })
})
