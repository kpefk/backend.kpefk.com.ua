import { Module } from '@nestjs/common'

import { GoogleWorkspaceService } from './google-workspace.service'

@Module({
  providers: [GoogleWorkspaceService],
  exports: [GoogleWorkspaceService],
})
export class GoogleWorkspaceModule {}
