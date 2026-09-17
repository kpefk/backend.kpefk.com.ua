import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'

/**
 * Позначає роут (або весь контролер) як публічний — глобальний AuthGuard
 * пропускає його без сесії.
 *
 * Оскільки AuthGuard прив'язаний глобально через APP_GUARD, за замовчуванням
 * кожен роут закритий (fail closed). Забутий `@Authorization()` більше не
 * відкриває ендпоінт назовні — натомість треба свідомо додати `@Public()`.
 * Тому цей декоратор — єдина точка, де публічність стає явною і помітною
 * на code review.
 *
 * @returns SetMetadata, що позначає handler/клас як публічний.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
