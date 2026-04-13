import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { HistoryQueryDto } from './dto/history-query.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class HistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getHistory(userId: string, query: HistoryQueryDto) {
    const where: Prisma.FileJobWhereInput = {
      userId,
      deletedAt: null,
      ...(query.status && { status: query.status as any }),
      ...(query.operationType && { operationType: { startsWith: query.operationType } }),
      ...(query.dateFrom && { createdAt: { gte: new Date(query.dateFrom) } }),
      ...(query.dateTo && { createdAt: { lte: new Date(query.dateTo) } }),
    };

    const [items, total] = await Promise.all([
      this.prisma.fileJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.limit,
        include: { options: true },
      }),
      this.prisma.fileJob.count({ where }),
    ]);

    return {
      items: items.map((job) => ({
        id: job.id,
        originalFilename: job.originalFilename,
        operationType: job.operationType,
        sourceFormat: job.sourceFormat,
        targetFormat: job.targetFormat,
        status: job.status,
        fileSizeBefore: Number(job.fileSizeBefore),
        fileSizeAfter: job.fileSizeAfter ? Number(job.fileSizeAfter) : null,
        createdAt: job.createdAt,
        completedAt: job.completedAt,
        expiresAt: job.expiresAt,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / (query.limit || 20)),
      },
    };
  }

  async deleteEntry(jobId: string, userId: string) {
    const job = await this.prisma.fileJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Запись не найдена');
    if (job.userId !== userId) throw new ForbiddenException('Нет доступа');

    await this.prisma.fileJob.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });

    await this.auditLogService.log({
      action: 'delete_history',
      userId,
      entityType: 'file_job',
      entityId: jobId,
    });

    return { message: 'Запись удалена' };
  }

  async clearAll(userId: string) {
    const result = await this.prisma.fileJob.updateMany({
      where: { userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    await this.auditLogService.log({
      action: 'clear_history',
      userId,
      metadata: { count: result.count },
    });

    return { message: `Удалено записей: ${result.count}` };
  }

  async getRepeatData(jobId: string, userId: string) {
    const job = await this.prisma.fileJob.findUnique({
      where: { id: jobId },
      include: { options: true },
    });
    if (!job) throw new NotFoundException('Запись не найдена');
    if (job.userId !== userId) throw new ForbiddenException('Нет доступа');

    return {
      operationType: job.operationType,
      sourceFormat: job.sourceFormat,
      targetFormat: job.targetFormat,
      options: Object.fromEntries(
        job.options.map((o) => [o.optionKey, o.optionValue]),
      ),
    };
  }
}
