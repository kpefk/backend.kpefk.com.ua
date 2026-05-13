import { Module } from '@nestjs/common';
import { EdboService } from './edbo.service';

@Module({
  providers: [EdboService],
  exports: [EdboService],
})
export class EdboModule {}