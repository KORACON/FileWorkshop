/**
 * Worker Process — фоновая обработка задач.
 *
 * Это ОТДЕЛЬНЫЙ Node.js процесс, не часть NestJS.
 * Подключается напрямую к PostgreSQL через Prisma.
 * Запускается через PM2 или systemd.
 *
 * Архитектура:
 * 1. Polling loop: каждые N секунд проверяет очередь
 * 2. Захват задачи: SELECT ... FOR UPDATE SKIP LOCKED
 * 3. Маршрутизация: operationType → handler
 * 4. Обработка: handler вызывает системные инструменты (sharp, qpdf, libreoffice)
 * 5. Результат: обновление статуса в БД, файл в processed/
 * 6. Ошибка: retry или ERROR статус
 */

import { PrismaClient, FileJob } from '@prisma/client';
import { hostname } from 'os';
import { resolve } from 'path';
import { config } from 'dotenv';
import { WorkerLoop } from './worker-loop';
import { HandlerRegistry } from './handler-registry';
import { WorkerConfig, loadConfig } from './worker-config';

// Загружаем .env из корня api
config({ path: resolve(__dirname, '..', '..', 'api', '.env') });

const prisma = new PrismaClient();
const workerId = `worker-${hostname()}-${process.pid}`;

async function main() {
  console.log(`[${workerId}] Worker запускается...`);

  await prisma.$connect();
  console.log(`[${workerId}] Подключение к PostgreSQL установлено`);

  const cfg = loadConfig();
  const registry = new HandlerRegistry(cfg);
  const loop = new WorkerLoop(prisma, registry, cfg, workerId);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[${workerId}] Получен ${signal}, завершение...`);
    loop.stop();
    // Ждём завершения текущей задачи (максимум 30 сек)
    await loop.waitForCurrentJob(30000);
    await prisma.$disconnect();
    console.log(`[${workerId}] Worker остановлен`);
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Восстановление зависших задач при старте
  await loop.recoverStaleJobs();

  // Запуск polling loop
  await loop.start();
}

main().catch((err) => {
  console.error(`[FATAL] Worker crashed:`, err);
  process.exit(1);
});
