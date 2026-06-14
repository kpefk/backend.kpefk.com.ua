import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { UserRole } from '@prisma/client'
import type { Request } from 'express'

import { PrismaService } from '@/prisma/prisma.service'

const ADMIN_ROLES: UserRole[] = [
  UserRole.HEAD_OF_DEPARTMENT,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATOR,
]

/**
 * Verifies that the authenticated user is either:
 *  - The curator of the group identified by :groupId route param, OR
 *  - A user with an admin-level role.
 *
 * Must be applied AFTER AuthGuard (requires request.user).
 */
@Injectable()
export class GroupLeaderGuard implements CanActivate {
  public constructor(private readonly prisma: PrismaService) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user: { id: string; role: UserRole } }>()
    const user = req.user

    if (ADMIN_ROLES.includes(user.role)) return true

    const groupId = Array.isArray(req.params['groupId'])
      ? req.params['groupId'][0]
      : req.params['groupId']
    if (!groupId) throw new ForbiddenException('groupId відсутній у маршруті.')

    const teacher = await this.prisma.teacher.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })

    if (!teacher) {
      throw new ForbiddenException('Ви не є педагогічним працівником.')
    }

    const group = await this.prisma.group.findFirst({
      where: { id: groupId, curatorId: teacher.id },
      select: { id: true },
    })

    if (!group) {
      throw new ForbiddenException('Ви не є керівником цієї групи.')
    }

    return true
  }
}
