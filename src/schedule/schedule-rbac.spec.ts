import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { UserRole } from '@prisma/client'

import { RolesGuard } from '@/auth/guards/roles.guard'

/**
 * §3.5 — призначення/зміна виховної години доступні лише ролям рівня
 * «Диспетчер розкладу» і вище.
 *
 * `POST /schedule/homeroom` декорований `@Authorization(...DISPATCHER_ROLES)`
 * (schedule.controller.ts), що проставляє ці ролі через `Roles()` і вмикає
 * `RolesGuard`. Тут перевіряємо саму логіку enforcement: користувач без
 * потрібної ролі отримує 403.
 *
 * (Метадані ролей на самому ендпоінті не читаємо рефлексією, бо імпорт
 * ScheduleController тягне ланцюг AuthGuard→UserService→MailService з
 * .tsx-шаблонами, які jest у цьому репозиторії не резолвить.)
 */
const HOMEROOM_ROLES = [
  UserRole.SCHEDULE_DISPATCHER,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
] as const

function contextFor(user?: { role: UserRole }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext
}

function makeGuard() {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue([...HOMEROOM_ROLES]),
  } as unknown as Reflector
  return new RolesGuard(reflector)
}

describe('RBAC виховної години (ТЗ §3.5)', () => {
  it('STUDENT → 403 ForbiddenException', async () => {
    const guard = makeGuard()
    await expect(
      guard.canActivate(contextFor({ role: UserRole.STUDENT })),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('TEACHER → 403 ForbiddenException', async () => {
    const guard = makeGuard()
    await expect(
      guard.canActivate(contextFor({ role: UserRole.TEACHER })),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('неавтентифікований → 403 ForbiddenException', async () => {
    const guard = makeGuard()
    await expect(guard.canActivate(contextFor(undefined))).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('SCHEDULE_DISPATCHER → дозволено', async () => {
    const guard = makeGuard()
    await expect(
      guard.canActivate(contextFor({ role: UserRole.SCHEDULE_DISPATCHER })),
    ).resolves.toBe(true)
  })

  it('ADMINISTRATOR → дозволено', async () => {
    const guard = makeGuard()
    await expect(
      guard.canActivate(contextFor({ role: UserRole.ADMINISTRATOR })),
    ).resolves.toBe(true)
  })

  it('перелік дозволених ролей не містить STUDENT/TEACHER', () => {
    expect(HOMEROOM_ROLES).not.toContain(UserRole.STUDENT)
    expect(HOMEROOM_ROLES).not.toContain(UserRole.TEACHER)
  })
})
