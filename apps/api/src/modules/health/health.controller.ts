import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check() {
    let dbStatus = 'ok';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'healthy' : 'unhealthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: {
        database: dbStatus,
        memory: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        },
      },
    };
  }
}
