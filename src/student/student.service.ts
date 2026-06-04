import { Injectable, NotFoundException } from '@nestjs/common'
import { Student } from '@prisma/client'

import { PrismaService } from '@/prisma/prisma.service'

@Injectable()
export class StudentService {
  public constructor(private readonly prisma: PrismaService) {}

  public async findAll(): Promise<Student[]> {
    return this.prisma.student.findMany({
      orderBy: [{ personFIO: 'asc' }],
    })
  }

  public async findById(id: string): Promise<Student> {
    const student = await this.prisma.student.findUnique({ where: { id } })
    if (!student) throw new NotFoundException('Студента не знайдено.')
    return student
  }
}
