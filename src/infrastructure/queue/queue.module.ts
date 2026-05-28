import { Module, Global } from '@nestjs/common';
import { InMemoryQueueService } from './in-memory-queue.service';

@Global()
@Module({
  providers: [InMemoryQueueService],
  exports: [InMemoryQueueService],
})
export class QueueModule {}
