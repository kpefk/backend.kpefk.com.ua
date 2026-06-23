import { EdboService } from './edbo.service'

/**
 * Перевіряємо single-flight авторизації: паралельні виклики getAccessToken
 * не повинні робити більше одного запиту /oauth/token (ЄДЕБО відхиляє
 * одночасні авторизації — duplicate session key).
 */
describe('EdboService — авторизація (single-flight)', () => {
  let service: EdboService

  function mockTokenFetch(): { calls: () => number } {
    let calls = 0
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => {
        calls++
        await new Promise((r) => setTimeout(r, 20)) // імітуємо мережеву затримку
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              access_token: 'TOKEN',
              token_type: 'bearer',
              expires_in: 3600,
            }),
        } as unknown as Response
      })
    return { calls: () => calls }
  }

  beforeEach(() => {
    service = new EdboService()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('паралельні виклики роблять рівно один запит токена', async () => {
    const { calls } = mockTokenFetch()

    const tokens = await Promise.all([
      service.getAccessToken(),
      service.getAccessToken(),
      service.getAccessToken(),
    ])

    expect(calls()).toBe(1)
    expect(tokens).toEqual(['TOKEN', 'TOKEN', 'TOKEN'])
  })

  it('повторний виклик використовує кешований токен (без нового запиту)', async () => {
    const { calls } = mockTokenFetch()

    await service.getAccessToken()
    await service.getAccessToken()

    expect(calls()).toBe(1)
  })

  it('після збою авторизації наступний виклик пробує знову', async () => {
    let calls = 0
    jest.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      calls++
      if (calls === 1) {
        return {
          ok: false,
          status: 400,
          text: async () => '{"error":"duplicate"}',
        } as unknown as Response
      }
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ access_token: 'TOKEN', token_type: 'bearer', expires_in: 3600 }),
      } as unknown as Response
    })

    await expect(service.getAccessToken()).rejects.toBeDefined()
    // in-flight проміс очищено → новий виклик робить новий запит
    await expect(service.getAccessToken()).resolves.toBe('TOKEN')
    expect(calls).toBe(2)
  })
})
