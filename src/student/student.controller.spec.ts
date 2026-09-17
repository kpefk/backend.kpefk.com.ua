import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { StudentController } from './student.controller'
import { StudentService } from './student.service'

jest.mock('@/user/user.service', () => ({
	UserService: class UserService {}
}))

describe('StudentController', () => {
	let controller: InstanceType<typeof StudentController>

	beforeEach(async () => {
		const studentService = {
			findAll: jest.fn(),
			findById: jest.fn(),
			previewEmail: jest.fn(),
			provisionEmail: jest.fn(),
			provisionAllEmails: jest.fn()
		}
		const allow = { canActivate: () => true }

		const module: TestingModule = await Test.createTestingModule({
			controllers: [StudentController],
			providers: [{ provide: StudentService, useValue: studentService }]
		})
			.overrideGuard(AuthGuard)
			.useValue(allow)
			.overrideGuard(RolesGuard)
			.useValue(allow)
			.compile()

		controller = module.get(StudentController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})
})
