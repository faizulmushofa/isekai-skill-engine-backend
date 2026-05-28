import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class InMemoryQueueService {
  private readonly logger = new Logger(InMemoryQueueService.name);
  private queue: Array<{ id: string; job: () => Promise<void> }> = [];
  private activeCount = 0;
  
  // Can be moved to .env in the future
  private readonly CONCURRENCY_LIMIT = 2;

  /**
   * Adds a job to the local memory queue.
   * Execution happens asynchronously in the background.
   */
  async addJob(id: string, job: () => Promise<void>): Promise<void> {
    this.logger.log(`Job [${id}] added to queue. Current queue length: ${this.queue.length}, Active: ${this.activeCount}`);
    this.queue.push({ id, job });
    
    // We don't await this so it runs in the background
    this.processQueue();
  }

  private async processQueue() {
    if (this.activeCount >= this.CONCURRENCY_LIMIT || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeCount++;
    this.logger.log(`Starting job [${item.id}]. Active processes: ${this.activeCount}`);
    
    try {
      await item.job();
      this.logger.log(`Job [${item.id}] completed successfully.`);
    } catch (error) {
      this.logger.error(`Job [${item.id}] execution failed: ${error.message}`, error.stack);
    } finally {
      this.activeCount--;
      
      // Attempt to process next item in queue
      this.processQueue();
    }
  }
}
