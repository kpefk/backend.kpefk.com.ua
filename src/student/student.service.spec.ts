import { Test, TestingModule } from '@nestjs/testing'

import { GoogleWorkspaceService } from '@/libs/google-workspace/google-workspace.service'
import { PrismaService } from '@/prisma/prisma.service'

import { StudentService } from './student.service'

describe('StudentService', () => {
	let service: StudentService

	beforeEach(async () => {
		const prisma = {
			student: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
				update: jest.fn()
			}
		}
		const workspace = {
			provisionStudentEmail: jest.fn(),
			suspendUser: jest.fn()
		}

		const module: TestingModule = await Test.createTestingModule({
			providers: [
				StudentService,
				{ provide: PrismaService, useValue: prisma },
				{ provide: GoogleWorkspaceService, useValue: workspace }
			]
		}).compile()

		service = module.get<StudentService>(StudentService)
	})

	it('should be defined', () => {
		expect(service).toBeDefined()
	})
})
