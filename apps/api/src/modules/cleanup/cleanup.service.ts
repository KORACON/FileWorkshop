import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly jobsService: JobsService,
  ) {}

  /** Удаление просроченных файлов и задач */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredFiles() {
    const expiredJobs = await this.prisma.fileJob.findMany({
      where: {
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
    });

    for (const job of expiredJobs) {
      try {
        if (job.storedOriginalPath) await this.storageService.deleteFile(job.storedOriginalPath);
        if (job.storedOutputPath) await this.storageService.deleteFile(job.storedOutputPath);
        await this.prisma.fileJob.update({
          where: { id: job.id },
          data: { deletedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Ошибка очистки задачи ${job.id}: ${err}`);
      }
    }

    if (expiredJobs.length > 0) {
      this.logger.log(`Очищено ${expiredJobs.length} просроченных задач`);
    }
  }

  /** Удаление просроченных сессий */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanExpiredSessions() {
    const result = await this.prisma.userSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            AND: [
              { revokedAt: { not: null } },
              { revokedAt: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
            ],
          },
        ],
      },
    });

    if (result.count > 0) {
      this.logger.log(`Удалено ${result.count} просроченных сессий`);
    }
  }

  /** Возврат зависших задач в очередь */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseStaleJobs() {
    await this.jobsService.releaseStaleJobs(10);
  }

  /** Очистка старых аудит-логов (старше 1 года) */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanOldAuditLogs() {
    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Удалено ${result.count} старых аудит-логов`);
    }
  }
}
