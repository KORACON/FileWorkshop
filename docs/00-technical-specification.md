# Техническая спецификация
# «Универсальная мастерская файлов»

Версия: 1.0
Дата: Апрель 2026

---

## 1. Описание продукта

Веб-приложение для конвертации и обработки файлов. Все преобразования выполняются локально на сервере без зависимости от внешних платных API. Пользователь загружает файл, выбирает действие, получает результат.

Ключевые характеристики:
- Обработка изображений, PDF и документов в одном сервисе
- Регистрация, профиль, история операций
- Фоновая обработка через очередь задач
- Freemium-модель монетизации
- Безопасное хранение и автоматическое удаление файлов

## 2. Цели

| Цель | Метрика | Срок |
|------|---------|------|
| Запуск MVP | Работающий сервис с auth + upload + image/PDF/doc tools | 30-45 дней |
| Валидация спроса | 1000 регистраций | 3 месяца |
| Первые платные пользователи | 50 подписок | 6 месяцев |
| Устойчивый рост | MRR $1000+ | 12 месяцев |

## 3. Целевая аудитория

| Сегмент | Задачи | Ценность |
|---------|--------|----------|
| Студенты, преподаватели | PDF, конспекты, фото документов | Бесплатно, без установки ПО |
| Офисные сотрудники | Отчёты, сканы, конвертация документов | Быстро, без IT-отдела |
| Фрилансеры | Подготовка файлов клиентам | Пакетная обработка, пресеты |
| Продавцы маркетплейсов | Изображения товаров, размеры, оптимизация | Размеры для WB/Ozon в один клик |
| Обычные пользователи | Бытовые задачи с файлами | Понятный интерфейс |

## 4. MVP — функции первой версии

### 4.1. Инструменты

Изображения (12 конвертаций + 5 операций):
- JPG↔PNG, WEBP↔JPG, WEBP↔PNG, PNG↔WEBP, JPG↔WEBP
- AVIF→JPG, AVIF→PNG, BMP→PNG, TIFF→JPG, HEIC→JPG, HEIC→PNG
- Resize, compress, rotate, crop, удаление EXIF

PDF (10 операций):
- Merge, split, extract pages, rotate, compress
- Images→PDF, PDF→PNG/JPG, remove metadata, reorder pages

Документы (11 конвертаций):
- DOCX→PDF, ODT→PDF, RTF→PDF, TXT→PDF, HTML→PDF
- DOCX→TXT, ODT→TXT, Markdown→PDF, Markdown→HTML
- HTML→Markdown, TXT→DOCX

### 4.2. Пользовательская часть

- Регистрация по email + пароль (уникальность email)
- Вход, выход, refresh token
- Профиль с статистикой
- История операций с фильтрами, повтором, удалением
- Drag-and-drop upload
- Polling статуса задачи
- Скачивание результата
- Управление сессиями

## 5. Расширенные функции (после MVP)

- PNG↔ICO, SVG→PNG/JPG, favicon-пакет
- Водяной знак, пакетное изменение размера
- Размеры для маркетплейсов (Telegram, VK, Instagram, WB, Ozon)
- Нумерация страниц PDF, защита паролем
- OCR (Tesseract)
- DOCX↔ODT, EPUB→PDF, CSV↔XLSX, PPTX→PDF
- Медиа-модуль: MP4→MP3, WAV→MP3, обрезка аудио/видео
- API для B2B, рабочие пространства, white-label

## 6. Технологический стек

| Компонент | Технология | Версия |
|-----------|-----------|--------|
| Frontend | Next.js (App Router) + React + TypeScript | 15.x / 19.x |
| Стилизация | Tailwind CSS | 3.4 |
| Формы | React Hook Form + Zod | 7.x / 3.x |
| Запросы | TanStack Query | 5.x |
| Состояние | Zustand | 5.x |
| Backend | NestJS + TypeScript | 10.x |
| БД | PostgreSQL | 16 |
| ORM | Prisma | 6.x |
| Auth | JWT (access + refresh) + Argon2id + httpOnly cookies | — |
| Worker | Node.js (отдельный процесс) | 22.x |
| Изображения | sharp (libvips) + ImageMagick (fallback) | 0.33 / 7.x |
| PDF | pdf-lib + Ghostscript + Poppler | 1.17 / 10.x / 24.x |
| Документы | LibreOffice headless + Pandoc | 24.x / 3.x |
| Архивация | archiver (Node.js) | 7.x |
| Веб-сервер | Nginx | 1.24+ |
| Процесс-менеджер | PM2 | 5.x |
| ОС | Ubuntu 24.04 LTS | — |
| SSL | Let's Encrypt (Certbot) | — |

## 7. Архитектура

```
┌─────────────┐     ┌─────────┐     ┌──────────────┐     ┌────────────┐
│   Browser   │────▶│  Nginx  │────▶│  Next.js SSR │     │ PostgreSQL │
│  (React UI) │     │ :80/443 │     │   :3000      │     │  :5432     │
└─────────────┘     └────┬────┘     └──────────────┘     └─────┬──────┘
                         │                                      │
                         │          ┌──────────────┐            │
                         └─────────▶│  NestJS API  │◀───────────┘
                                    │   :4000      │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐     ┌──────────────┐
                                    │   Worker      │────▶│  /storage/   │
                                    │  (Node.js)   │     │  temp/orig/  │
                                    └──────────────┘     │  proc/quar/  │
                                                         └──────────────┘
```

Маршрутизация Nginx:
- `/` → Next.js :3000
- `/api/*` → NestJS :4000
- `/storage` → deny all (404)

PM2 управляет тремя процессами: `api`, `web`, `worker`.

### Поток обработки файла:

1. Пользователь загружает файл (drag-and-drop)
2. Frontend → `POST /api/files/upload` (multipart + options)
3. Backend: JWT проверка → MIME validation (3 уровня) → сохранение в `temp/` → перемещение в `original/`
4. Backend: создание `file_job` (status: QUEUED) → ответ `{ jobId }`
5. Frontend: polling `GET /api/jobs/:id/status` каждые 2 сек
6. Worker: `SELECT ... FOR UPDATE SKIP LOCKED` → захват задачи → status: PROCESSING
7. Worker: вызов handler-а (sharp / ghostscript / libreoffice / pandoc)
8. Worker: результат в `processed/` → status: DONE + fileSizeAfter
9. Frontend: polling → status: DONE → кнопка «Скачать»
10. `GET /api/files/:id/download` → проверка прав → stream файла

## 8. Модули Backend

| Модуль | Ответственность |
|--------|----------------|
| `auth` | Регистрация, вход, выход, JWT access/refresh, Argon2id, rate limit |
| `users` | CRUD пользователей, уникальность email |
| `profile` | Просмотр/редактирование профиля, статистика |
| `files` | Upload (Multer), MIME validation, download с проверкой прав |
| `storage` | Абстракция ФС: save/move/delete/stream, path traversal защита |
| `jobs` | Создание задач, статусы, acquireNext (FOR UPDATE SKIP LOCKED) |
| `history` | Список операций, фильтры, удаление, повтор |
| `audit-log` | Запись действий (login, upload, delete) |
| `security` | ThrottlerGuard, Helmet, CORS |
| `health` | GET /api/health — БД, память, uptime |
| `cleanup` | Cron: удаление expired файлов, сессий, stale jobs |

### Worker Handlers:

| Handler | Инструменты | Операции |
|---------|------------|----------|
| `image.handler.ts` | sharp + ImageMagick (fallback) | convert, resize, compress, rotate, crop, remove_exif |
| `pdf.handler.ts` | pdf-lib + Ghostscript + Poppler | merge, split, extract, rotate, compress, to_images, from_images, remove_metadata, reorder |
| `document.handler.ts` | LibreOffice headless + Pandoc | DOCX→PDF, MD→HTML, HTML→MD, TXT→DOCX и др. |

## 9. База данных

### Таблицы:

| Таблица | Назначение | Ключевые поля |
|---------|-----------|---------------|
| `users` | Пользователи | email (UNIQUE), password_hash (Argon2id), role, is_active |
| `user_sessions` | Сессии | refresh_token_hash (SHA-256), expires_at, revoked_at |
| `file_jobs` | Задачи обработки | status (QUEUED→PROCESSING→DONE/ERROR), operation_type, file paths, sizes, locked_at/locked_by |
| `job_options` | Параметры задачи | key-value (quality, width, pages и т.д.) |
| `audit_logs` | Журнал действий | action, entity_type, entity_id, ip, metadata (JSONB) |
| `billing_plans` | Тарифы (future) | name, slug, limits (JSONB), features (JSONB) |
| `user_subscriptions` | Подписки (future) | user_id, plan_id, status, expires_at |

### Ключевые индексы:

- `users.email` — UNIQUE (уникальность + быстрый поиск при логине)
- `file_jobs(status, priority, created_at)` — idx_worker_polling (FOR UPDATE SKIP LOCKED)
- `file_jobs(user_id, created_at DESC)` — история пользователя
- `file_jobs(expires_at)` — cleanup cron
- `audit_logs(user_id, created_at DESC)` — аудит по пользователю

Полная Prisma schema: `apps/api/prisma/schema.prisma`

## 10. Аутентификация

### Механизм:

```
Access Token:  JWT, 15 мин, в памяти (Zustand store)
Refresh Token: JWT, 7 дней, httpOnly cookie (path: /api/auth)
Пароль:        Argon2id (memoryCost: 64MB, timeCost: 3, parallelism: 4)
Refresh hash:  SHA-256 в БД (не Argon2 — токен уже криптографически случайный)
```

### Безопасность auth:

| Мера | Реализация |
|------|------------|
| Timing attack | Фиктивный argon2.hash при несуществующем email |
| Cookie | httpOnly, secure, sameSite: strict, path: /api/auth |
| Rate limit | 5 попыток/мин на login и register |
| Ротация refresh | При каждом refresh старый токен инвалидируется |
| Ошибки | Единое сообщение «Неверный email или пароль» |
| Управление сессиями | Просмотр, отзыв одной, отзыв всех |

### Endpoints:

| Метод | URL | Auth | Rate Limit |
|-------|-----|------|------------|
| POST | /api/auth/register | Нет | 5/мин |
| POST | /api/auth/login | Нет | 5/мин |
| POST | /api/auth/logout | JWT | — |
| POST | /api/auth/refresh | Cookie | — |
| GET | /api/auth/sessions | JWT | — |
| DELETE | /api/auth/sessions/:id | JWT | — |

## 11. Профиль и история

### Профиль (/profile):
- Карточка пользователя (email, имя, дата регистрации)
- 4 виджета статистики (всего операций, изображений, PDF, сэкономлено)
- Последние 5 операций
- Настройки: изменение имени, смена пароля, управление сессиями

### История (/profile/history):
- Таблица с пагинацией (20 записей/страница)
- Фильтры: статус, тип операции, дата от/до
- Каждая строка: файл, операция, статус (badge), размер до→после, дата
- Действия: скачать результат, скачать оригинал, повторить, удалить
- «Повторить» → переход на страницу инструмента с предзаполненными параметрами
- «Очистить всю историю» с подтверждением

### Каждая запись содержит:
- Имя исходного файла, тип операции, исходный/целевой формат
- Статус (QUEUED / PROCESSING / DONE / ERROR / CANCELED)
- Размер до и после, процент изменения
- Дата создания и завершения
- Срок хранения файла

## 12. Безопасность

### Threat model: 21 угроза, 5 типов атакующих

Полный анализ: `docs/13-security-hardening.md`

### Критические меры (реализованы):

| # | Мера | Реализация |
|---|------|------------|
| 1 | HTTPS | Nginx + Let's Encrypt, HSTS header |
| 2 | Пароли | Argon2id, никогда в открытом виде |
| 3 | Cookies | httpOnly, secure, sameSite: strict |
| 4 | CORS | Только свой домен, credentials: true |
| 5 | Валидация | DTO + Zod (frontend) + class-validator (backend) + whitelist: true |
| 6 | MIME проверка | 3 уровня: расширение → Content-Type → magic bytes |
| 7 | Path traversal | UUID-имена, basename(), resolve() + startsWith() |
| 8 | Файлы | Приватный доступ только через backend, Nginx deny /storage |
| 9 | Rate limit | Nginx (4 зоны) + NestJS ThrottlerGuard |
| 10 | Audit log | login, logout, register, upload, download, delete |
| 11 | Cleanup | Cron: temp (1ч), expired files, sessions, stale jobs |
| 12 | Command injection | execFile (не exec), UUID-пути, нет shell: true |
| 13 | XSS | React auto-escape, CSP header, X-Content-Type-Options: nosniff |
| 14 | SQL injection | Prisma ORM (parameterized queries) |
| 15 | Secrets | .env (chmod 600), не в git, разные JWT секреты |

### Чек-лист перед production: 40+ пунктов в `docs/13-security-hardening.md`

## 13. Фоновые задачи

### Архитектура очереди:

```
Backend: INSERT file_jobs (QUEUED)
    ↓
PostgreSQL: file_jobs таблица
    ↓
Worker: SELECT ... FOR UPDATE SKIP LOCKED → PROCESSING
    ↓
Handler: sharp / ghostscript / libreoffice / pandoc
    ↓
Worker: UPDATE file_jobs (DONE / ERROR)
```

### Конечный автомат:

```
QUEUED → PROCESSING → DONE
                   → ERROR (retry < max → QUEUED)
                   → ERROR (retry >= max → финальная ошибка)
QUEUED → CANCELED (пользователь отменил)
PROCESSING → QUEUED (stale lock recovery)
```

### Параметры:

| Параметр | Значение |
|----------|----------|
| Polling interval (пустая очередь) | 3 сек |
| Polling interval (есть задачи) | 500 мс |
| Concurrency | 2 параллельных задачи |
| Job timeout | 120 сек |
| Max retries | 3 |
| Stale lock timeout | 10 мин |
| Graceful shutdown | 30 сек ожидание текущей задачи |

### Масштабирование:
- Горизонтальное: PM2 instances: N (FOR UPDATE SKIP LOCKED работает без изменений)
- Вертикальное: WORKER_CONCURRENCY=4
- Вынос на отдельный сервер: DATABASE_URL по сети + NFS/S3 для storage

## 14. Хранение файлов

### Структура:

```
/storage/
├── temp/        ← Multer upload (UUID-имена)
├── original/    ← Оригиналы после валидации
├── processed/   ← Результаты обработки
├── quarantine/  ← Подозрительные файлы (MIME mismatch)
└── failed/      ← Файлы задач с ошибкой
```

### Политика хранения:

| Тип | Срок | Очистка |
|-----|------|---------|
| temp | 1 час | Каждые 15 мин (cron) |
| Анонимные задачи | 24 часа | Каждый час (CleanupService) |
| Free пользователи | 7 дней | Каждый час |
| Plus | 30 дней | Каждый час |
| Pro | 90 дней | Каждый час |
| quarantine | 48 часов | Раз в сутки |
| failed | 7 дней | Раз в сутки |

### Безопасность хранения:
- UUID-имена (оригинальное имя только в БД)
- chmod 750, нет execution permission
- Nginx deny /storage
- Доступ только через backend с проверкой user_id

## 15. Frontend

### Страницы:

| Маршрут | Рендеринг | Назначение |
|---------|-----------|------------|
| `/` | SSR | Главная: категории, популярные инструменты |
| `/tools` | SSR | Каталог всех инструментов |
| `/tools/[category]` | SSR | Инструменты категории |
| `/tools/[category]/[tool]` | CSR | Страница инструмента: upload → process → download |
| `/auth/login` | CSR | Вход |
| `/auth/register` | CSR | Регистрация |
| `/profile` | CSR (protected) | Обзор профиля, статистика |
| `/profile/history` | CSR (protected) | История операций |
| `/profile/settings` | CSR (protected) | Настройки, смена пароля, сессии |
| `/pricing` | SSR | Тарифы |
| `/faq`, `/privacy`, `/terms` | SSR | Статические страницы |

### Ключевые компоненты:
- `FileDropzone` — drag-and-drop с валидацией формата/размера
- `OperationForm` — динамическая форма из tool.options (slider, select, number, pages)
- `JobStatusDisplay` — 5 состояний: queued, processing, done, error, canceled
- `HistoryTable` — таблица с фильтрами, пагинацией, действиями
- `ToolPageContent` — конечный автомат: idle → uploaded → processing → done/error

### Auth на frontend:
- Access token в Zustand store (в памяти, не localStorage)
- Refresh token в httpOnly cookie (устанавливается backend-ом)
- Автоматический refresh при 401 в api-client
- AuthGuard для protected routes, GuestGuard для auth-страниц

### Реестр инструментов:
Декларативный `tools-registry.ts` — добавление нового инструмента = добавление объекта. UI формы генерируются из `tool.options`. i18n-ready через `{ ru, en }` поля.

## 16. Roadmap разработки

| Этап | Срок | Содержание |
|------|------|------------|
| 0. Подготовка | 1-2 дня | Monorepo, TypeScript, ESLint, PostgreSQL, .env |
| 1. БД и Prisma | 1-2 дня | Schema, миграции, seed |
| 2. Backend-ядро | 2-3 дня | NestJS scaffold, filters, interceptors, health |
| 3. Auth | 3-4 дня | Register, login, logout, refresh, rate limit, audit |
| 4. Upload и Storage | 2-3 дня | Multer, MIME validation, path traversal, download |
| 5. Job Queue и Worker | 3-4 дня | PostgreSQL queue, polling, retry, timeout, PM2 |
| 6. Image Tools | 3-4 дня | 12 конвертаций + resize/compress/rotate/crop/EXIF |
| 7. PDF Tools | 3-4 дня | 10 операций: merge, split, compress, to_images и др. |
| 8. Document Tools | 2-3 дня | 11 конвертаций: DOCX→PDF, MD→HTML и др. |
| 9. Frontend — каркас | 3-4 дня | Layout, API client, auth store, routing |
| 10. Frontend — Auth/Profile | 2-3 дня | Формы, профиль, история, настройки |
| 11. Frontend — инструменты | 3-4 дня | Dropzone, operation form, job status, download |
| 12. Security Hardening | 2-3 дня | CORS, CSRF, rate limit, cleanup, audit |
| 13. Тестирование | 3-5 дней | Unit + integration + E2E |
| 14. Deployment | 1-2 дня | Nginx, PM2, SSL, backup, cron |

Общая оценка: 30-45 дней (один разработчик).
Рабочий прототип (auth + upload + image conversion): ~15 дней.

## 17. Монетизация

### Модель: freemium

Бесплатный пользователь всегда получает результат. Ограничения по объёму и удобству, не по доступу.

### Тарифы:

| | Free | Plus | Pro | Business |
|---|------|------|-----|----------|
| Цена | 0 | 299 ₽/мес | 699 ₽/мес | 2990 ₽/мес |
| Размер файла | 25 МБ | 100 МБ | 500 МБ | 2 ГБ |
| Операций/день | 5-15 | 100 | 500 | ∞ |
| Batch | Нет | 10 файлов | 50 файлов | 100 файлов |
| История | 0-7 дней | 90 дней | 365 дней | ∞ |
| Хранение | 1-24 ч | 7 дней | 30 дней | 90 дней |
| Очередь | Обычная | Приоритетная | Приоритетная | Приоритетная |
| API | Нет | Нет | Нет | Да |
| Пользователей | 1 | 1 | 1 | 10 |

### Roadmap монетизации:
1. Фаза 0 (0-3 мес): всё бесплатно с лимитами, валидация спроса
2. Фаза 1 (3-6 мес): ЮKassa для РФ, тариф Plus
3. Фаза 2 (6-12 мес): Stripe для запада, Pro и Business
4. Фаза 3 (12+ мес): API, B2B, рабочие пространства

Полная стратегия: `docs/16-monetization.md`

## 18. Риски

| # | Риск | Приоритет | Митигация |
|---|------|-----------|-----------|
| 1 | Загрузка вредоносных файлов | CRITICAL | Whitelist MIME + magic bytes + quarantine + UUID-имена |
| 2 | Path traversal | CRITICAL | basename() + resolve() + startsWith() + UUID-имена |
| 3 | Brute force login | HIGH | Rate limit 5/мин (Nginx + NestJS) + audit log |
| 4 | IDOR (доступ к чужим файлам) | HIGH | Проверка user_id на каждом download/delete |
| 5 | Перегрузка сервера | HIGH | Очередь задач + concurrency limit + job timeout |
| 6 | Исчерпание диска | HIGH | Cleanup cron + лимиты размера + мониторинг |
| 7 | Двойная обработка задачи | MEDIUM | FOR UPDATE SKIP LOCKED |
| 8 | Worker crash | MEDIUM | Stale lock recovery + PM2 autorestart |
| 9 | Сложность DOCX→PDF | MEDIUM | LibreOffice headless (не идеален), честные предупреждения в UI |
| 10 | Archive bomb | MEDIUM | Проверка ratio сжатия + лимит распакованного размера |

## 19. Deployment

### Инфраструктура:
- 1 VPS Ubuntu 24.04 LTS
- Nginx (reverse proxy, SSL, rate limiting)
- PM2 (api + web + worker)
- PostgreSQL 16 (локально)
- Let's Encrypt (HTTPS)

### Системные пакеты:
Node.js 22, ImageMagick, Ghostscript, Poppler, LibreOffice headless, Pandoc, Fail2ban

### Процессы:

| Процесс | Порт | PM2 | Memory limit |
|---------|------|-----|-------------|
| api (NestJS) | 4000 | fork ×1 | 512 MB |
| web (Next.js) | 3000 | fork ×1 | 512 MB |
| worker | — | fork ×1 | 1 GB |

### Backup:
- Ежедневный pg_dump + .env + Nginx config
- Retention: 30 дней
- Файлы пользователей НЕ бэкапятся (временные)

### Деплой:
Скрипт `deploy/deploy.sh`: backup БД → git pull → npm ci → prisma migrate → npm run build → pm2 restart → health check

Полная инструкция: `docs/15-deployment.md`

## 20. Тестирование

### Стратегия:

| Уровень | Количество | Инструменты |
|---------|-----------|-------------|
| Unit | 100-150 тестов | Jest (backend), Vitest (frontend) |
| Integration | 30-50 тестов | Jest + Supertest + test DB |
| E2E | 5-10 тестов | Playwright |

### Приоритеты автоматизации:

Фаза 1 (перед релизом): Auth + Upload + MIME validation + Access control + 1 E2E flow
Фаза 2 (после первых пользователей): Jobs + History + Profile + Image handler
Фаза 3 (стабилизация): PDF + Document handlers + Cleanup + Batch + все E2E

Полный тест-план с 150+ тест-кейсами: `docs/14-test-plan.md`

## 21. Структура проекта

```
file-workshop/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/        # auth, users, profile, files, storage,
│   │   │   │                   # jobs, history, audit-log, security,
│   │   │   │                   # health, cleanup
│   │   │   ├── common/         # filters, interceptors, middleware, dto
│   │   │   ├── config/         # app, auth, storage, throttle configs
│   │   │   ├── prisma/         # PrismaService
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   └── prisma/
│   │       └── schema.prisma
│   │
│   ├── web/                    # Next.js frontend
│   │   ├── app/                # App Router (pages)
│   │   ├── components/         # ui, layout, auth, tools, profile, shared
│   │   ├── hooks/              # use-upload, use-job-polling, use-history
│   │   ├── stores/             # auth-store (Zustand)
│   │   ├── lib/                # api-client, validations, utils
│   │   └── types/              # api, user, job, tool, history
│   │
│   └── worker/                 # Фоновый обработчик
│       └── src/
│           ├── worker.ts       # Entry point
│           ├── worker-loop.ts  # Polling loop
│           ├── handler-registry.ts
│           └── handlers/       # image, pdf, document
│
├── storage/                    # Файловое хранилище (не в git)
├── deploy/                     # Nginx config, scripts
├── docs/                       # Документация (14 документов)
├── ecosystem.config.js         # PM2
└── README.md
```

## 22. Документация проекта

| Документ | Содержание |
|----------|-----------|
| `00-technical-specification.md` | Этот документ — финальная спецификация |
| `01-architecture.md` | Архитектура, модули, поток данных, roadmap |
| `02-database-schema.md` | ER-модель, Prisma schema, индексы, cleanup |
| `03-backend-architecture.md` | Дерево файлов, модули, DTO, middleware |
| `04-auth-module.md` | Auth endpoints, схема токенов, уникальность email |
| `05-upload-storage.md` | Upload flow, MIME validation, path traversal |
| `06-job-queue-worker.md` | Очередь, lock strategy, polling, retry |
| `07-image-module.md` | Матрица конвертаций, sharp vs ImageMagick |
| `08-pdf-module.md` | 10 операций, инструменты, ограничения |
| `09-document-module.md` | Таблица конвертаций, LibreOffice + Pandoc |
| `10-frontend-architecture.md` | App Router, компоненты, auth strategy, UX |
| `13-security-hardening.md` | Threat model, 20 мер, чек-лист production |
| `14-test-plan.md` | 150+ тест-кейсов, приоритеты автоматизации |
| `15-deployment.md` | Пошаговая инструкция для VPS |
| `16-monetization.md` | Тарифы, метрики, roadmap монетизации |

---

Конец спецификации.
