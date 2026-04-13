import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

// Config
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import storageConfig from './config/storage.config';
import throttleConfig from './config/throttle.config';

// Core
import { PrismaModule } from './prisma/prisma.module';

// Middleware
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

// Global filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

// Global interceptors
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

// Feature modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfileModule } from './modules/profile/profile.module';
import { FilesModule } from './modules/files/files.module';
import { StorageModule } from './modules/storage/storage.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { HistoryModule } from './modules/history/history.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { SecurityModule } from './modules/security/security.module';
import { HealthModule } from './modules/health/health.module';
import { CleanupModule } from './modules/cleanup/cleanup.module';

@Module({
  imports: [
    // Конфигурация из .env
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, storageConfig, throttleConfig],
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Cron-задачи
    ScheduleModule.forRoot(),

    // Core
    PrismaModule,

    // Feature modules
    AuthModule,
    UsersModule,
    ProfileModule,
    FilesModule,
    StorageModule,
    JobsModule,
    HistoryModule,
    AuditLogModule,
    SecurityModule,
    HealthModule,
    CleanupModule,
  ],
  providers: [
    // Global exception filters (порядок важен: более специфичный первым)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
