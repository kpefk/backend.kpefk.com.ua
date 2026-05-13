/**
 * Тип для відповіді з токенами доступу.
 *
 * Цей тип описує структуру даних, що містить токени доступу, отримані від OAuth-провайдера.
 */
export type TokenResponse = {
    access_token: string
    refresh_token?: string
    expires_at?: number
    expires_in?: number
}
