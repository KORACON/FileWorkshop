# Job Queue и Worker — документация

## 1. Архитектура очереди

```
┌──────────┐     INSERT file_jobs      ┌────────────┐
│ Backend  │  ─────(QUEUED)──────────▶ │ PostgreSQL │
│ (NestJS) │                           │  file_jobs │
└──────────┘                           └─────┬──────┘
                                             │
                                    SELECT FOR UPDATE
                                      SKIP LOCKED
                                             │
                                       ┌─────▼──────┐
                                       │   Worker    │
                                       │  (Node.js)  │
                                       └─────┬──────┘
                                             │
                              ┌──────────────┼──────────────┐
                              ▼              ▼              ▼
                        image.handler   pdf.handler   doc.handler
                         (sharp)       (pdf-lib/gs)  (libreoffice)
                              │              │              │
                              └──────────────┼──────────────┘
                                             │
                                    UPDATE file_jobs
                                      (DONE/ERROR)
                                             │
                                       ┌─────▼──────┐
                                       │ PostgreSQL │
                                       └────────────┘
```

### Почему PostgreSQL, а не Redis:

1. Уже есть в стеке — не нужен дополнительный сервис
2. `FOR UPDATE SKIP LOCKED` — атомарный захват задачи, как в профессиональных очередях
3. ACID-гарантии — задача не потеряется при крэше
4. Для нагрузки до ~1000 задач/час PostgreSQL более чем достаточен
5. При росте можно добавить Redis/BullMQ без изменения API

### Когда переходить на Redis:
- Более 10 000 задач/час
- Нужны приоритетные очереди с delay
- Нужен pub/sub для real-time уведомлений
- Несколько серверов с worker-ами

## 2. Конечный автомат задачи

```
                    ┌──────────┐
                    │  QUEUED  │◀──────────────────┐
                    └────┬─────┘                   │
                         │                         │
                    acquireNext()             retryOrFail()
                    FOR UPDATE               (retry_count <
                    SKIP LOCKED               max_retries)
                         │                         │
                    ┌────▼──────┐                  │
                    │PROCESSING │──────────────────┘
                    └────┬──────┘        ошибка
                         │
              ┌──────────┼──────────┐
              │          │          │
         ┌────▼───┐ ┌───▼────┐ ┌───▼─────┐
         │  DONE  │ │ ERROR  │ │CANCELED │
         └────────┘ └────────┘ └─────────┘
```

| Переход | Условие | Кто делает |
|---------|---------|------------|
| QUEUED → PROCESSING | Worker захватил задачу | Worker (acquireNext) |
| PROCESSING → DONE | Handler вернул результат | Worker (completeJob) |
| PROCESSING → ERROR | Handler бросил ошибку + retry >= max | Worker (retryOrFail) |
| PROCESSING → QUEUED | Handler бросил ошибку + retry < max | Worker (retryOrFail) |
| PROCESSING → QUEUED | Stale lock timeout | Cron (releaseStaleJobs) |
| QUEUED → CANCELED | Пользователь отменил | Backend (cancelJob) |

## 3. Lock Strategy — защита от двойной обработки

```sql
UPDATE file_jobs
SET status = 'PROCESSING', locked_at = NOW(), locked_by = 'worker-host-1234'
WHERE id = (
    SELECT id FROM file_jobs
    WHERE status = 'QUEUED' AND deleted_at IS NULL
    ORDER BY priority DESC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED    -- ← ключевая строка
)
RETURNING *
```

Как это работает:
1. `SELECT ... FOR UPDATE` — блокирует строку на уровне PostgreSQL
2. `SKIP LOCKED` — если строка уже заблокирована другой транзакцией, пропускает её
3. Вложенный SELECT + UPDATE в одном запросе — атомарная операция
4. `RETURNING *` — возвращает захваченную задачу без дополнительного SELECT

При 5 worker-ах одновременно:
- Worker A берёт задачу #1 (блокирует строку)
- Worker B пропускает #1 (SKIP LOCKED), берёт #2
- Worker C пропускает #1 и #2, берёт #3
- Коллизий нет

## 4. Polling Strategy

```
Worker запущен
    │
    ▼
┌─ Polling Loop ──────────────────────────────────┐
│                                                  │
│  activeJobs < concurrency?                       │
│  ├─ Да → acquireNext()                          │
│  │   ├─ Задача есть → processJob() (async)      │
│  │   │   sleep(500ms)  ← быстрый poll           │
│  │   └─ Задач нет                               │
│  │       sleep(3000ms) ← обычный poll            │
│  └─ Нет (все слоты заняты)                      │
│      sleep(3000ms)                               │
│                                                  │
│  Ошибка БД → exponential backoff (1s→2s→4s→30s) │
└──────────────────────────────────────────────────┘
```

Параметры (через env):
- `WORKER_POLL_INTERVAL_MS=3000` — интервал при пустой очереди
- `WORKER_POLL_INTERVAL_BUSY_MS=500` — интервал при наличии задач
- `WORKER_CONCURRENCY=2` — параллельных задач
- `WORKER_JOB_TIMEOUT_MS=120000` — таймаут одной задачи (2 мин)

## 5. Обработка ошибок

| Ситуация | Действие |
|----------|----------|
| Handler бросил ошибку, retry < max | Задача → QUEUED, retry_count++ |
| Handler бросил ошибку, retry >= max | Задача → ERROR |
| Таймаут обработки | Как ошибка handler-а (retry или ERROR) |
| Worker упал (kill -9) | Stale lock recovery через cron (каждые 5 мин) |
| Worker перезапущен | recoverStaleJobs() при старте |
| Неизвестный operationType | Задача → ERROR (без retry) |
| Ошибка подключения к БД | Exponential backoff, worker продолжает попытки |
| Ошибка записи файла | Как ошибка handler-а |

## 6. Масштабирование

### Горизонтальное (несколько worker-ов):

```javascript
// ecosystem.config.js
{
  name: 'worker',
  instances: 3,  // 3 worker-процесса
  exec_mode: 'fork',
  env: { WORKER_CONCURRENCY: 2 }  // 2 задачи на процесс = 6 параллельных
}
```

`FOR UPDATE SKIP LOCKED` работает без изменений при любом количестве worker-ов.

### Вертикальное (больше concurrency):

```bash
WORKER_CONCURRENCY=4  # 4 параллельных задачи в одном процессе
```

Ограничение: CPU и RAM. Sharp/Ghostscript/LibreOffice потребляют ресурсы.
Рекомендация: concurrency = количество CPU ядер / 2.

### Вынос на отдельный сервер:

Worker подключается к PostgreSQL по сети. Достаточно:
1. Скопировать apps/worker на другой сервер
2. Указать DATABASE_URL с IP основного сервера
3. Примонтировать storage (NFS/SSHFS) или перейти на S3

## 7. Запуск

### PM2:
```bash
# Сборка
cd apps/worker && npm run build

# Запуск
pm2 start ecosystem.config.js --only worker

# Логи
pm2 logs worker

# Мониторинг
pm2 monit
```

### Systemd:
```ini
# /etc/systemd/system/file-workshop-worker.service
[Unit]
Description=File Workshop Worker
After=postgresql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/file-workshop/apps/worker
ExecStart=/usr/bin/node dist/worker.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=WORKER_CONCURRENCY=2
EnvironmentFile=/var/www/file-workshop/apps/api/.env

# Graceful shutdown
KillSignal=SIGTERM
TimeoutStopSec=35

# Ограничение ресурсов
MemoryMax=1G
CPUQuota=200%

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable file-workshop-worker
sudo systemctl start file-workshop-worker
sudo journalctl -u file-workshop-worker -f
```
