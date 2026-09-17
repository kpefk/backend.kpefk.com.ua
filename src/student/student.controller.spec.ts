import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'

jest.unstable_mockModule('@/user/user.service', () => ({
	UserService: class UserService {}
}))

const { AuthGuard } =
	(await import('@/auth/guards/auth.guard')) as typeof import('@/auth/guards/auth.guard')
const { RolesGuard } =
	(await import('@/auth/guards/roles.guard')) as typeof import('@/auth/guards/roles.guard')
const { StudentController } =
	(await import('./student.controller')) as typeof import('./student.controller')
const { StudentService } =
	(await import('./student.service')) as typeof import('./student.service')

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
