import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { StorageModule } from '../storage/storage.module';
import { JobsModule } from '../jobs/jobs.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [
    StorageModule,
    JobsModule,
    AuditLogModule,

    // Multer: файлы сохраняются в temp/ с UUID-именами
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        storage: diskStorage({
          destination: configService.get<string>('storage.tempDir'),
          filename: (_req, file, cb) => {
            let ext = extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
            if (!ext || ext === '.') ext = '.bin';
            if (ext.length > 10) ext = ext.substring(0, 10);
            cb(null, `${randomUUID()}${ext}`);
          },
        }),
        limits: {
          fileSize: configService.get<number>('storage.maxFileSizeMb', 50) * 1024 * 1024,
          files: 20,
        },
      }),
    }),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}
