import { Module } from '@nestjs/common';
import { EntranceController } from './entrance.controller';
import { EntranceService } from './entrance.service';
import { EdboModule } from '../core/edbo.module';

@Module({
  imports: [EdboModule],
  controllers: [EntranceController],
  providers: [EntranceService],
  exports: [EntranceService],
})
export class EntranceModule {}
