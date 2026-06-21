import { Module } from '@nestjs/common'

import { EdboModule } from '@/edbo/core/edbo.module'
import { PrismaModule } from '@/prisma/prisma.module'
import { UserModule } from '@/user/user.module'

import { DiplomaController } from './diploma.controller'
import { DiplomaEdboService } from './diploma-edbo.service'
import { DiplomaGeneratorService } from './diploma-generator.service'
import { DiplomaImportService } from './diploma-import.service'
import { DiplomaService } from './diploma.service'
import { DiplomaTemplateController } from './diploma-template.controller'
import { DiplomaTemplateService } from './diploma-template.service'

@Module({
  imports: [PrismaModule, UserModule, EdboModule],
  controllers: [DiplomaController, DiplomaTemplateController],
  providers: [
    DiplomaImportService,
    DiplomaService,
    DiplomaEdboService,
    DiplomaGeneratorService,
    DiplomaTemplateService,
  ],
  exports: [DiplomaTemplateService, DiplomaGeneratorService],
})
export class DiplomaModule {}
