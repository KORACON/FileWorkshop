import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../../common/interfaces/request-with-user.interface';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':id/status')
  async getStatus(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const job = await this.jobsService.findById(id);
    if (!job || job.userId !== user.id) {
      return { status: 'NOT_FOUND' };
    }

    return {
      id: job.id,
      status: job.status,
      operationType: job.operationType,
      originalFilename: job.originalFilename,
      fileSizeBefore: Number(job.fileSizeBefore),
      fileSizeAfter: job.fileSizeAfter ? Number(job.fileSizeAfter) : null,
      errorMessage: job.errorMessage,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}
