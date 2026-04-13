import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';

@Module({
  imports: [StorageModule, JobsModule],
  providers: [CleanupService],
})
export class CleanupModule {}
