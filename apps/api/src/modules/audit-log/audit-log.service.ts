import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface AuditLogInput {
  action: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          userId: input.userId,
          entityType: input.entityType,
          entityId: input.entityId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          metadata: input.metadata ? (input.metadata as any) : undefined,
        },
      });
    } catch (error) {
      // Аудит-лог не должен ломать основной flow
      this.logger.error(`Ошибка записи аудит-лога: ${error}`);
    }
  }
}
