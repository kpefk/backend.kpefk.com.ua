import { Test, TestingModule } from '@nestjs/testing'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { StudentController } from './student.controller'
import { StudentService } from './student.service'

describe('StudentController', () => {
	let controller: StudentController

	beforeEach(async () => {
		// StudentService is mocked rather than instantiated: the real one pulls in
		// PrismaService and GoogleWorkspaceService (and, transitively, the mailer),
		// none of which this controller-level test needs.
		const studentService = {
			findAll: jest.fn(),
			findById: jest.fn(),
			provisionEmails: jest.fn()
		}

		// The controller is annotated with @Authorization(...), which applies
		// UseGuards(AuthGuard, RolesGuard) at class level; stub both so the test
		// does not have to stand up the whole auth dependency graph.
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

		controller = module.get<StudentController>(StudentController)
	})

	it('should be defined', () => {
		expect(controller).toBeDefined()
	})
})
