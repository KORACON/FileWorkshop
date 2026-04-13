# Архитектура проекта «Универсальная мастерская файлов»

## 1. Общая архитектура

```
┌─────────────┐     ┌─────────┐     ┌──────────────┐     ┌────────────┐
│   Browser    │────▶│  Nginx  │────▶│  Next.js SSR │     │ PostgreSQL │
│  (React UI) │     │ :80/443 │     │   :3000      │     │  :5432     │
└─────────────┘     └────┬────┘     └──────────────┘     └─────┬──────┘
                         │                                      │
                         │          ┌──────────────┐            │
                         └─────────▶│  NestJS API  │◀───────────┘
                                    │   :4000      │
                                    └──────┬───────┘
                                           │
                                    ┌──────▼───────┐     ┌──────────────┐
                                    │   Worker      │────▶│  File Storage│
                                    │  (Node.js)   │     │  /storage/   │
                                    └──────────────┘     └──────────────┘
```

### Компоненты:

| Компонент | Технология | Порт | Роль |
|-----------|-----------|------|------|
| Reverse Proxy | Nginx | 80/443 | SSL-терминация, маршрутизация, статика, rate limit |
| Frontend | Next.js (App Router) | 3000 | SSR/CSR, UI, взаимодействие с API |
| Backend API | NestJS | 4000 | REST API, auth, upload, управление задачами |
| Worker | Node.js (отдельный процесс) | — | Фоновая обработка файлов |
| БД | PostgreSQL | 5432 | Пользователи, задачи, история, аудит |
| Хранилище | Локальная ФС | — | Файлы: temp, original, processed, quarantine, failed |

### Маршрутизация Nginx:

```
/              → Next.js :3000  (frontend)
/api/*         → NestJS  :4000  (backend API)
/api/files/*   → NestJS  :4000  (upload/download)
```

### Процесс-менеджер:

PM2 управляет тремя процессами:
- `web` — Next.js frontend
- `api` — NestJS backend
- `worker` — фоновый обработчик задач

## 2. Модули Backend (NestJS)

| Модуль | Ответственность |
|--------|----------------|
| `auth` | Регистрация, вход, выход, JWT access/refresh tokens, Argon2id хэширование, rate limit на login/register |
| `users` | CRUD пользователей, проверка уникальности email (UNIQUE INDEX в БД + проверка в сервисе) |
| `profile` | Просмотр/редактирование профиля, статистика пользователя |
| `files` | Upload endpoint, валидация MIME/расширений, ограничение размера, создание file_job |
| `storage` | Абстракция над файловым хранилищем: сохранение, чтение, удаление, генерация безопасных имён, защита от path traversal |
| `jobs` | Создание задач, обновление статусов, polling endpoint для клиента |
| `history` | Список операций пользователя, фильтрация, удаление записей, повтор операции |
| `conversions` | Реестр доступных операций, маршрутизация к нужному обработчику (image/pdf/document) |
| `image-tools` | Конвертация изображений, resize, compress, rotate, удаление EXIF (sharp + ImageMagick) |
| `pdf-tools` | Merge, split, compress, rotate, extract pages, images→PDF, PDF→images (pdf-lib, qpdf, ghostscript, poppler) |
| `doc-tools` | DOCX→PDF, Markdown→HTML, HTML→PDF и т.д. (LibreOffice headless, Pandoc) |
| `audit-log` | Запись действий: login, logout, upload, delete, массовые операции |
| `security` | Guards, CORS, CSRF, helmet, валидация, interceptors для логирования |
| `health` | Healthcheck endpoint: БД, диск, worker alive |
| `cleanup` | Cron-задачи: удаление просроченных файлов, очистка temp, ротация старых записей |

### Зависимости между модулями:

```
auth ──▶ users ──▶ profile
files ──▶ storage ──▶ jobs ──▶ conversions
                                  ├──▶ image-tools
                                  ├──▶ pdf-tools
                                  └──▶ doc-tools
jobs ──▶ history
auth, files, jobs ──▶ audit-log
cleanup ──▶ storage, jobs
```

## 3. Страницы Frontend (Next.js App Router)

| Маршрут | Страница | Рендеринг | Описание |
|---------|----------|-----------|----------|
| `/` | Главная | SSR | Категории инструментов, hero-блок, быстрый доступ |
| `/tools` | Каталог инструментов | SSR | Все инструменты с поиском и фильтрацией по категориям |
| `/tools/[category]` | Категория | SSR | Инструменты одной категории (images, pdf, documents, utilities) |
| `/tools/[category]/[tool]` | Страница инструмента | CSR | Upload, выбор параметров, запуск обработки, скачивание результата |
| `/auth/register` | Регистрация | CSR | Форма: email, пароль, подтверждение, согласие |
| `/auth/login` | Вход | CSR | Форма: email, пароль |
| `/profile` | Профиль | CSR (protected) | Личные данные, статистика, избранные инструменты |
| `/profile/history` | История | CSR (protected) | Таблица операций, фильтры, повтор, удаление |
| `/profile/settings` | Настройки | CSR (protected) | Смена пароля, управление сессиями, удаление аккаунта |
| `/pricing` | Тарифы | SSR | Free / Plus / Pro / Business |
| `/faq` | FAQ | SSR | Частые вопросы |
| `/privacy` | Политика конфиденциальности | SSR | Юридический текст |
| `/terms` | Условия использования | SSR | Юридический текст |

### Ключевые компоненты UI:

- `FileDropzone` — drag-and-drop загрузка с валидацией формата/размера
- `ToolCard` — карточка инструмента в каталоге
- `JobStatusTracker` — polling статуса задачи (queued → processing → done/error)
- `HistoryTable` — таблица истории с фильтрами, сортировкой, пагинацией
- `AuthForms` — формы регистрации/входа (React Hook Form + Zod)
- `ProfileStats` — виджеты статистики профиля
- `DownloadButton` — скачивание результата
- `BatchUploader` — загрузка нескольких файлов для пакетных операций

## 4. Поток данных: от загрузки до результата

```
Пользователь                Frontend                  Backend API              Worker                Storage
    │                          │                          │                      │                     │
    │  1. Выбирает инструмент  │                          │                      │                     │
    │  2. Загружает файл       │                          │                      │                     │
    │─────drag & drop─────────▶│                          │                      │                     │
    │                          │  3. POST /api/files/upload│                      │                     │
    │                          │  (multipart + options)   │                      │                     │
    │                          │─────────────────────────▶│                      │                     │
    │                          │                          │  4. Валидация:        │                     │
    │                          │                          │  - auth (JWT)         │                     │
    │                          │                          │  - MIME type          │                     │
    │                          │                          │  - расширение         │                     │
    │                          │                          │  - размер файла       │                     │
    │                          │                          │  - rate limit         │                     │
    │                          │                          │                      │                     │
    │                          │                          │  5. Сохранение ──────────────────────────▶│
    │                          │                          │     в /storage/temp   │                     │
    │                          │                          │                      │                     │
    │                          │                          │  6. Создание file_job │                     │
    │                          │                          │     status: queued    │                     │
    │                          │                          │     INSERT в БД       │                     │
    │                          │                          │                      │                     │
    │                          │  7. Response: { jobId }  │                      │                     │
    │                          │◀─────────────────────────│                      │                     │
    │                          │                          │                      │                     │
    │                          │  8. Polling: GET /api/jobs/:id/status           │                     │
    │                          │─────────────────────────▶│                      │                     │
    │                          │                          │                      │                     │
    │                          │                          │      9. Worker polling│                     │
    │                          │                          │◀─────────────────────│                     │
    │                          │                          │  SELECT ... FOR UPDATE│                     │
    │                          │                          │  SKIP LOCKED          │                     │
    │                          │                          │                      │                     │
    │                          │                          │  10. status→processing│                     │
    │                          │                          │─────────────────────▶│                     │
    │                          │                          │                      │  11. Читает файл    │
    │                          │                          │                      │◀────────────────────│
    │                          │                          │                      │                     │
    │                          │                          │                      │  12. Обработка:     │
    │                          │                          │                      │  sharp/ImageMagick  │
    │                          │                          │                      │  qpdf/ghostscript   │
    │                          │                          │                      │  libreoffice/pandoc │
    │                          │                          │                      │                     │
    │                          │                          │                      │  13. Результат ────▶│
    │                          │                          │                      │  /storage/processed  │
    │                          │                          │                      │                     │
    │                          │                          │  14. UPDATE file_job  │                     │
    │                          │                          │  status: done         │                     │
    │                          │                          │  file_size_after      │                     │
    │                          │                          │  output_path          │                     │
    │                          │                          │◀─────────────────────│                     │
    │                          │                          │                      │                     │
    │                          │  15. Polling → status:done│                     │                     │
    │                          │◀─────────────────────────│                      │                     │
    │                          │                          │                      │                     │
    │  16. Кнопка «Скачать»   │                          │                      │                     │
    │─────────────────────────▶│  17. GET /api/files/:jobId/download             │                     │
    │                          │─────────────────────────▶│                      │                     │
    │                          │                          │  18. Проверка прав    │                     │
    │                          │                          │  19. Stream файла ◀──────────────────────│
    │                          │◀─────────────────────────│                      │                     │
    │◀─────────файл────────────│                          │                      │                     │
```

### Ключевые моменты потока:

1. Файл никогда не отдаётся напрямую из storage — только через backend с проверкой авторизации
2. Worker берёт задачи через `SELECT ... FOR UPDATE SKIP LOCKED` — защита от двойной обработки
3. Frontend делает polling каждые 2-3 секунды до получения финального статуса
4. При ошибке worker ставит status: error + error_message, frontend показывает причину
5. Исходный файл перемещается из temp в original после создания job
6. Результат пишется в processed с уникальным именем (UUID)

## 5. Структура Monorepo

```
file-workshop/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/                      # App Router
│   │   │   ├── (auth)/               # Группа auth-страниц
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (main)/               # Основные страницы
│   │   │   │   ├── page.tsx          # Главная
│   │   │   │   └── tools/
│   │   │   │       ├── page.tsx      # Каталог
│   │   │   │       └── [category]/
│   │   │   │           ├── page.tsx  # Категория
│   │   │   │           └── [tool]/
│   │   │   │               └── page.tsx  # Инструмент
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx          # Профиль
│   │   │   │   ├── history/
│   │   │   │   └── settings/
│   │   │   ├── pricing/
│   │   │   ├── faq/
│   │   │   ├── privacy/
│   │   │   ├── terms/
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/                   # Базовые UI-компоненты
│   │   │   ├── auth/                 # Формы auth
│   │   │   ├── tools/                # FileDropzone, ToolCard, JobStatus
│   │   │   ├── profile/              # ProfileStats, HistoryTable
│   │   │   └── layout/               # Header, Footer, Sidebar
│   │   ├── lib/
│   │   │   ├── api-client.ts         # HTTP-клиент к backend
│   │   │   ├── auth.ts               # Auth hooks и утилиты
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── stores/                   # Zustand stores
│   │   ├── types/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── api/                          # NestJS backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   ├── guards/
│   │   │   │   │   └── dto/
│   │   │   │   ├── users/
│   │   │   │   ├── profile/
│   │   │   │   ├── files/
│   │   │   │   ├── storage/
│   │   │   │   ├── jobs/
│   │   │   │   ├── history/
│   │   │   │   ├── conversions/
│   │   │   │   │   ├── image/
│   │   │   │   │   ├── pdf/
│   │   │   │   │   └── document/
│   │   │   │   ├── audit-log/
│   │   │   │   ├── security/
│   │   │   │   ├── health/
│   │   │   │   └── cleanup/
│   │   │   ├── common/
│   │   │   │   ├── filters/          # Exception filters
│   │   │   │   ├── interceptors/     # Logging, transform
│   │   │   │   ├── decorators/       # Custom decorators
│   │   │   │   ├── pipes/            # Validation pipes
│   │   │   │   └── guards/           # Global guards
│   │   │   ├── config/
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   ├── prisma.service.ts
│   │   │   │   └── schema.prisma
│   │   │   ├── app.module.ts
│   │   │   └── main.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                       # Фоновый обработчик
│       ├── src/
│       │   ├── worker.ts             # Entry point, polling loop
│       │   ├── handlers/
│       │   │   ├── image.handler.ts
│       │   │   ├── pdf.handler.ts
│       │   │   └── document.handler.ts
│       │   ├── processors/           # Обёртки над системными инструментами
│       │   └── utils/
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── types/                        # Общие TypeScript типы
│   │   ├── src/
│   │   │   ├── user.ts
│   │   │   ├── job.ts
│   │   │   ├── file.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── config/                       # Общие конфигурации (eslint, tsconfig)
│   └── utils/                        # Общие утилиты
│
├── storage/                          # Файловое хранилище (не в git)
│   ├── temp/
│   ├── original/
│   ├── processed/
│   ├── quarantine/
│   └── failed/
│
├── docs/                             # Документация
├── .env.example
├── .gitignore
├── package.json                      # Root package.json (workspaces)
├── turbo.json                        # Turborepo config (опционально)
└── README.md
```

### Почему monorepo:

- Общие типы между frontend, backend и worker без дублирования
- Единый линтинг и форматирование
- Атомарные коммиты при изменении API-контракта
- Упрощённый CI/CD

### Компромисс:

Если monorepo окажется избыточным на старте, допустимо начать с двух репозиториев (`web` + `api+worker`) и вынести общие типы в npm-пакет позже. Но monorepo с npm workspaces настраивается за 10 минут и сразу даёт правильную структуру.

## 6. Ключевые сущности БД

### ER-диаграмма (упрощённая):

```
users ─────────┬──────── user_sessions
               │
               ├──────── file_jobs ──────── job_options
               │
               └──────── audit_logs
```

### Таблицы:

#### `users`
| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID, PK | Уникальный идентификатор |
| email | VARCHAR, UNIQUE | Email пользователя (UNIQUE INDEX) |
| password_hash | VARCHAR | Argon2id хэш пароля |
| name | VARCHAR, nullable | Отображаемое имя |
| role | ENUM (user, admin) | Роль, default: user |
| is_active | BOOLEAN | Активен ли аккаунт |
| created_at | TIMESTAMP | Дата регистрации |
| updated_at | TIMESTAMP | Дата обновления |
| last_login_at | TIMESTAMP, nullable | Последний вход |

#### `user_sessions`
| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID, PK | |
| user_id | UUID, FK → users | |
| refresh_token_hash | VARCHAR | Хэш refresh token |
| ip_address | VARCHAR | IP при создании сессии |
| user_agent | VARCHAR | User-Agent браузера |
| expires_at | TIMESTAMP | Срок действия |
| created_at | TIMESTAMP | |
| revoked_at | TIMESTAMP, nullable | Когда отозвана |

#### `file_jobs`
| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID, PK | |
| user_id | UUID, FK → users, nullable | null для анонимных операций |
| original_filename | VARCHAR | Имя файла от пользователя |
| stored_original_path | VARCHAR | Путь к оригиналу на сервере |
| output_filename | VARCHAR, nullable | Имя результата |
| stored_output_path | VARCHAR, nullable | Путь к результату |
| mime_type | VARCHAR | MIME-тип исходного файла |
| file_size_before | BIGINT | Размер до обработки (байты) |
| file_size_after | BIGINT, nullable | Размер после |
| operation_type | VARCHAR | Тип операции (image.convert, pdf.merge и т.д.) |
| source_format | VARCHAR | Исходный формат |
| target_format | VARCHAR, nullable | Целевой формат |
| status | ENUM | queued, processing, done, error, canceled |
| error_message | TEXT, nullable | Описание ошибки |
| retry_count | INT, default 0 | Количество попыток |
| created_at | TIMESTAMP | |
| started_at | TIMESTAMP, nullable | Начало обработки |
| completed_at | TIMESTAMP, nullable | Завершение |
| deleted_at | TIMESTAMP, nullable | Soft delete |

Индексы: `(user_id, created_at)`, `(status)`, `(status, created_at)` для worker polling.

#### `job_options`
| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID, PK | |
| file_job_id | UUID, FK → file_jobs | |
| option_key | VARCHAR | Ключ параметра (quality, width, pages и т.д.) |
| option_value | VARCHAR | Значение |

#### `audit_logs`
| Поле | Тип | Описание |
|------|-----|----------|
| id | UUID, PK | |
| user_id | UUID, FK → users, nullable | |
| action | VARCHAR | login, logout, register, upload, delete_history и т.д. |
| entity_type | VARCHAR, nullable | user, file_job, session |
| entity_id | UUID, nullable | ID сущности |
| ip_address | VARCHAR | |
| metadata | JSONB, nullable | Дополнительные данные |
| created_at | TIMESTAMP | |

#### Таблицы для будущего (создать пустыми):
- `billing_plans` — тарифы
- `user_subscriptions` — подписки пользователей

## 7. Риски архитектуры

| # | Риск | Вероятность | Влияние | Митигация |
|---|------|-------------|---------|-----------|
| 1 | Перегрузка сервера при тяжёлых конвертациях (PDF, DOCX) | Высокая | Высокое | Очередь задач с лимитом concurrency в worker (max 2-3 параллельных задачи). Rate limit на upload. Таймаут на задачу (60-120 сек). |
| 2 | Загрузка вредоносных файлов | Высокая | Критическое | Whitelist MIME + расширений. Проверка real MIME через magic bytes. Обработка в изолированных temp-директориях. Никогда не исполнять загруженные файлы. ClamAV как опция. |
| 3 | Утечка файлов между пользователями | Средняя | Критическое | UUID-имена файлов. Доступ только через backend с проверкой user_id. Нет прямых ссылок на storage. |
| 4 | Исчерпание дискового пространства | Высокая | Высокое | Cron cleanup каждый час. Лимиты на размер файлов. Мониторинг свободного места. Политика хранения: temp — 1 час, анонимные — 24 часа, бесплатные — 7 дней. |
| 5 | Двойная обработка одной задачи | Средняя | Среднее | `SELECT ... FOR UPDATE SKIP LOCKED` при взятии задачи worker-ом. Атомарное обновление статуса. |
| 6 | Падение worker-а во время обработки | Средняя | Среднее | Задачи со статусом processing дольше таймаута автоматически возвращаются в queued (stale job recovery). retry_count с лимитом 3. |
| 7 | Сложность конвертации DOCX/PDF | Высокая | Среднее | LibreOffice headless не идеален. Честно указывать ограничения в UI. Не обещать pixel-perfect конвертацию. |
| 8 | Zip bomb при загрузке архивов | Низкая | Высокое | Проверка ratio сжатия. Лимит на размер распакованного содержимого. Обработка в quarantine. |
| 9 | Масштабирование при росте нагрузки | Средняя | Среднее | Архитектура позволяет вынести worker на отдельный сервер, БД на отдельный инстанс, storage на S3-совместимое хранилище. Но на старте — один VPS. |
| 10 | Path traversal через имена файлов | Средняя | Критическое | Генерация UUID-имён на сервере. Никогда не использовать пользовательское имя файла в путях. Валидация всех путей. |

## 8. Roadmap разработки

### Этап 0: Подготовка (1-2 дня)
- Инициализация monorepo (npm workspaces)
- Настройка TypeScript, ESLint, Prettier
- Настройка PostgreSQL
- Создание .env.example
- Базовая структура папок

### Этап 1: БД и Prisma (1-2 дня)
- Prisma schema со всеми таблицами
- Миграции
- Seed-скрипт для тестовых данных
- PrismaService для NestJS

### Этап 2: Backend-ядро (2-3 дня)
- NestJS scaffold с модульной структурой
- Global exception filter, validation pipe, logging interceptor
- Health module
- Конфигурация через @nestjs/config

### Этап 3: Auth (3-4 дня)
- Регистрация с проверкой уникальности email
- Вход с JWT access + refresh token
- Выход с инвалидацией сессии
- Argon2id хэширование
- httpOnly cookies
- Rate limiting
- Audit log для auth-событий

### Этап 4: Upload и Storage (2-3 дня)
- Upload endpoint с Multer
- MIME validation
- Безопасная генерация имён
- Storage service (save, read, delete, stream)
- Создание file_job при upload
- Download endpoint с проверкой прав

### Этап 5: Job Queue и Worker (3-4 дня)
- Job service (create, update status, get by id)
- Worker process с polling loop
- Lock strategy (FOR UPDATE SKIP LOCKED)
- Retry logic
- Timeout handling
- Stale job recovery
- PM2 конфигурация для worker

### Этап 6: Image Tools (3-4 дня)
- Все конвертации из MVP-списка
- Resize, compress, rotate
- Удаление EXIF
- Интеграция с worker handlers
- Batch operations

### Этап 7: PDF Tools (3-4 дня)
- Merge, split, extract pages
- Rotate, compress
- Images → PDF, PDF → images
- Удаление метаданных
- Перестановка страниц

### Этап 8: Document Tools (2-3 дня)
- DOCX/ODT/RTF/TXT → PDF
- Markdown ↔ HTML
- HTML → PDF
- TXT → DOCX
- Интеграция LibreOffice headless + Pandoc

### Этап 9: Frontend — каркас (3-4 дня)
- Next.js App Router структура
- Layout, Header, Footer
- API client (axios/fetch + interceptors)
- Auth context/store
- Protected routes
- Базовые UI-компоненты

### Этап 10: Frontend — Auth и Profile (2-3 дня)
- Формы регистрации/входа (React Hook Form + Zod)
- Профиль пользователя
- История операций
- Настройки аккаунта

### Этап 11: Frontend — инструменты (3-4 дня)
- Главная страница с категориями
- Каталог инструментов
- Страница инструмента с FileDropzone
- Job status polling
- Скачивание результата
- Batch upload UI

### Этап 12: Security Hardening (2-3 дня)
- CORS, CSRF, Helmet
- Rate limiting на все endpoints
- Secure cookies
- Input sanitization
- Cleanup cron jobs
- Audit log review

### Этап 13: Тестирование (3-5 дней)
- Unit-тесты для сервисов
- Integration-тесты для API
- E2E-тесты для критических сценариев
- Нагрузочное тестирование worker-а

### Этап 14: Deployment (1-2 дня)
- Nginx конфигурация
- PM2 ecosystem config
- SSL (Let's Encrypt)
- Log rotation
- Backup cron
- Мониторинг

---

**Общая оценка: 30-45 дней** при работе одного разработчика.
Первый рабочий прототип (auth + upload + image conversion) — через ~15 дней.
