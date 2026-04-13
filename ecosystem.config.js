/**
 * PM2 Ecosystem Config — управление всеми процессами.
 *
 * Запуск:   pm2 start ecosystem.config.js
 * Статус:   pm2 status
 * Логи:     pm2 logs
 * Рестарт:  pm2 restart all
 * Стоп:     pm2 stop all
 */
module.exports = {
  apps: [
    // ── Backend API (NestJS) ──
    {
      name: 'api',
      cwd: './apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        APP_PORT: 4000,
      },
      // Автоперезапуск при падении
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      // Мониторинг памяти — перезапуск при утечке
      max_memory_restart: '512M',
      // Логи
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // ── Worker (фоновая обработка) ──
    {
      name: 'worker',
      cwd: './apps/worker',
      script: 'dist/worker.js',
      instances: 1,              // Один worker на старте
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: 2,   // 2 параллельных задачи
        WORKER_POLL_INTERVAL_MS: 3000,
        WORKER_JOB_TIMEOUT_MS: 120000,
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',  // Worker может потреблять больше (sharp, ghostscript)
      // Graceful shutdown — ждём завершения текущей задачи
      kill_timeout: 35000,       // 35 сек (30 сек ожидание + 5 сек запас)
      shutdown_with_message: true,
      // Логи
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },

    // ── Frontend (Next.js) ──
    {
      name: 'web',
      cwd: './apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      error_file: './logs/web-error.log',
      out_file: './logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
