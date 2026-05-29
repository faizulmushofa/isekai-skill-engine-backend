import { Global, Module } from '@nestjs/common';
import { TokenTrackerService } from './token-tracker.service';

@Global()
@Module({
  providers: [TokenTrackerService],
  exports: [TokenTrackerService],
})
export class TokenTrackerModule {}
