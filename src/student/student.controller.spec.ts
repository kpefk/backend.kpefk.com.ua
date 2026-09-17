import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'

jest.unstable_mockModule('@/user/user.service', () => ({
	UserService: class UserService {}
}))

let AuthGuard: typeof import('@/auth/guards/auth.guard').AuthGuard
let RolesGuard: typeof import('@/auth/guards/roles.guard').RolesGuard
let StudentController: typeof import('./student.controller').StudentController
let StudentService: typeof import('./student.service').StudentService

describe('StudentController', () => {
	let controller: InstanceType<typeof StudentController>

	beforeAll(async () => {
		;({ AuthGuard } = await import('@/auth/guards/auth.guard'))
		;({ RolesGuard } = await import('@/auth/guards/roles.guard'))
		;({ StudentController } = await import('./student.controller'))
		;({ StudentService } = await import('./student.service'))
	})

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
