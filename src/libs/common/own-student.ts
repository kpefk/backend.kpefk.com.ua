import { ForbiddenException } from '@nestjs/common'

import type { PrismaService } from '@/prisma/prisma.service'

/**
 * Повертає id картки студента, привʼязаної до облікового запису (Student.userId → User.id).
 * Кидає ForbiddenException, якщо обліковий запис не привʼязано до жодного студента.
 *
 * Використовується self-access ендпоінтами (роль STUDENT): переданий у запиті studentId
 * ІГНОРУЄТЬСЯ і підміняється власним — студент фізично не може прочитати чужі дані
 * (IDOR-захист), а фронтенд може передавати як Student.id, так і User.id.
 */
export async function resolveOwnStudentId(
  prisma: PrismaService,
  userId: string,
): Promise<string> {
  const student = await prisma.student.findUnique({
    where: { userId },
    select: { id: true },
  })
  if (!student) {
    throw new ForbiddenException('Обліковий запис не привʼязано до картки студента.')
  }
  return student.id
}
