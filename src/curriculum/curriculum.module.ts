import { Module } from '@nestjs/common'

import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { CurriculaController } from './curricula/curricula.controller'
import { CurriculaService } from './curricula/curricula.service'
import { CurriculumVersionsController } from './curriculum-versions/curriculum-versions.controller'
import { CurriculumVersionsService } from './curriculum-versions/curriculum-versions.service'
import { EducationalProgramsController } from './educational-programs/educational-programs.controller'
import { EducationalProgramsService } from './educational-programs/educational-programs.service'
import { GroupAssignmentsController } from './group-assignments/group-assignments.controller'
import { GroupAssignmentsService } from './group-assignments/group-assignments.service'
import { SpecialtiesController } from './specialties/specialties.controller'
import { SpecialtiesService } from './specialties/specialties.service'
import { WorkingComponentTermsController } from './working-curricula/working-component-terms.controller'
import { WorkingCurriculaController } from './working-curricula/working-curricula.controller'
import { WorkingCurriculaService } from './working-curricula/working-curricula.service'

@Module({
  imports: [PrismaModule, UserModule],
  controllers: [
    SpecialtiesController,
    EducationalProgramsController,
    CurriculaController,
    CurriculumVersionsController,
    GroupAssignmentsController,
    WorkingCurriculaController,
    WorkingComponentTermsController,
  ],
  providers: [
    SpecialtiesService,
    EducationalProgramsService,
    CurriculaService,
    CurriculumVersionsService,
    GroupAssignmentsService,
    WorkingCurriculaService,
  ],
  exports: [
    SpecialtiesService,
    EducationalProgramsService,
    CurriculaService,
    CurriculumVersionsService,
    GroupAssignmentsService,
    WorkingCurriculaService,
  ],
})
export class CurriculumModule {}
