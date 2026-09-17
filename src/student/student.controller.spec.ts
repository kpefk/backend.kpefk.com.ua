import { jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'

jest.unstable_mockModule('@/user/user.service', () => ({
	UserService: class UserService {}
}))

let AuthGuard: typeof import('@/auth/guards/auth.guard').AuthGuard
let RolesGuard: typeof import('@/auth/guards/roles.guard').RolesGuard
let StudentController: typeof import('./student.controller').StudentController
let StudentService: typeof import('./student.service').StudentService
type StudentServiceStub = {
	findAll: jest.Mock
	findById: jest.Mock
	previewEmail: jest.Mock
	provisionEmail: jest.Mock
	provisionAllEmails: jest.Mock
}

describe('StudentController', () => {
	let controller: InstanceType<typeof StudentController>
	let studentService: StudentServiceStub

	beforeAll(async () => {
		;({ AuthGuard } = await import('@/auth/guards/auth.guard'))
		;({ RolesGuard } = await import('@/auth/guards/roles.guard'))
		;({ StudentController } = await import('./student.controller'))
		;({ StudentService } = await import('./student.service'))
	})

	beforeEach(async () => {
		studentService = {
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

	it('should delegate findAll to student service', async () => {
		const expected: Awaited<ReturnType<typeof controller.findAll>> = []
		const query: Parameters<typeof controller.findAll>[0] = { status: 'active' }

		studentService.findAll.mockResolvedValue(expected)

		await expect(controller.findAll(query)).resolves.toBe(expected)
		expect(studentService.findAll).toHaveBeenCalledWith('active')
	})
})
