# Архитектура Backend — NestJS

## 1. Дерево папок

```
apps/api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── jwt-refresh.strategy.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   ├── jwt-refresh.guard.ts
│   │   │   │   └── roles.guard.ts
│   │   │   ├── decorators/
│   │   │   │   ├── current-user.decorator.ts
│   │   │   │   ├── public.decorator.ts
│   │   │   │   └── roles.decorator.ts
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── auth-response.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.service.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       └── update-user.dto.ts
│   │   │
│   │   ├── profile/
│   │   │   ├── profile.module.ts
│   │   │   ├── profile.controller.ts
│   │   │   ├── profile.service.ts
│   │   │   └── dto/
│   │   │       ├── update-profile.dto.ts
│   │   │       ├── change-password.dto.ts
│   │   │       └── profile-response.dto.ts
│   │   │
│   │   ├── files/
│   │   │   ├── files.module.ts
│   │   │   ├── files.controller.ts
│   │   │   ├── files.service.ts
│   │   │   ├── pipes/
│   │   │   │   └── file-validation.pipe.ts
│   │   │   └── dto/
│   │   │       ├── upload-file.dto.ts
│   │   │       └── file-response.dto.ts
│   │   │
│   │   ├── storage/
│   │   │   ├── storage.module.ts
│   │   │   ├── storage.service.ts
│   │   │   └── storage.constants.ts
│   │   │
│   │   ├── jobs/
│   │   │   ├── jobs.module.ts
│   │   │   ├── jobs.controller.ts
│   │   │   ├── jobs.service.ts
│   │   │   └── dto/
│   │   │       ├── create-job.dto.ts
│   │   │       ├── job-status.dto.ts
│   │   │       └── job-response.dto.ts
│   │   │
│   │   ├── history/
│   │   │   ├── history.module.ts
│   │   │   ├── history.controller.ts
│   │   │   ├── history.service.ts
│   │   │   └── dto/
│   │   │       ├── history-query.dto.ts
│   │   │       └── history-response.dto.ts
│   │   │
│   │   ├── audit-log/
│   │   │   ├── audit-log.module.ts
│   │   │   └── audit-log.service.ts
│   │   │
│   │   ├── security/
│   │   │   ├── security.module.ts
│   │   │   └── throttle.config.ts
│   │   │
│   │   ├── health/
│   │   │   ├── health.module.ts
│   │   │   └── health.controller.ts
│   │   │
│   │   └── cleanup/
│   │       ├── cleanup.module.ts
│   │       └── cleanup.service.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── common/
│   │   ├── filters/
│   │   │   ├── all-exceptions.filter.ts
│   │   │   └── prisma-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform-response.interceptor.ts
│   │   ├── middleware/
│   │   │   └── request-id.middleware.ts
│   │   ├── decorators/
│   │   │   └── api-paginated.decorator.ts
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts
│   │   │   └── api-response.dto.ts
│   │   ├── interfaces/
│   │   │   ├── jwt-payload.interface.ts
│   │   │   └── request-with-user.interface.ts
│   │   └── constants/
│   │       ├── mime-types.ts
│   │       └── file-limits.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── auth.config.ts
│   │   ├── storage.config.ts
│   │   └── throttle.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── test/
│   └── app.e2e-spec.ts
│
├── .env.example
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

## 2. Что делает каждый модуль

| Модуль | Ответственность | Экспортирует |
|--------|----------------|--------------|
| `prisma` | Подключение к PostgreSQL, lifecycle hooks (onModuleInit, enableShutdownHooks) | `PrismaService` |
| `auth` | Регистрация, вход, выход, refresh token, JWT стратегии, guards | Guards, decorators |
| `users` | CRUD пользователей, проверка уникальности email, поиск по id/email | `UsersService` |
| `profile` | Просмотр/редактирование профиля, смена пароля, статистика | — |
| `files` | Upload endpoint (Multer), валидация MIME/размера, создание job, download endpoint | — |
| `storage` | Абстракция ФС: save/read/delete/stream файлов, генерация безопасных имён, пути | `StorageService` |
| `jobs` | Создание задач, обновление статусов, получение статуса по id, список задач пользователя | `JobsService` |
| `history` | Список операций пользователя с пагинацией/фильтрацией, удаление записей, повтор | — |
| `audit-log` | Запись действий (login, upload, delete и т.д.), без контроллера — только сервис | `AuditLogService` |
| `security` | Конфигурация throttle, helmet, CORS. Глобальные настройки безопасности | — |
| `health` | GET /api/health — проверка БД, диска, worker alive | — |
| `cleanup` | Cron-задачи: удаление просроченных файлов, сессий, stale jobs | — |

## 3. Связи между модулями

```
                    ┌──────────┐
                    │ security │  (глобальный, подключается в AppModule)
                    └──────────┘

┌────────┐    ┌───────┐    ┌─────────┐
│  auth  │───▶│ users │    │ profile │
└───┬────┘    └───┬───┘    └────┬────┘
    │             │             │
    │         ┌───▼───┐        │
    ├────────▶│prisma │◀───────┤
    │         └───┬───┘        │
    │             │             │
    │    ┌────────▼────────┐   │
    │    │   audit-log     │◀──┘
    │    └────────▲────────┘
    │             │
┌───▼────┐  ┌────┴───┐  ┌─────────┐
│ files  │─▶│  jobs  │  │ history │
└───┬────┘  └────┬───┘  └────┬────┘
    │            │            │
    ▼            │            │
┌────────┐       │            │
│storage │       │            │
└────────┘       ▼            ▼
            ┌────────┐  ┌─────────┐
            │cleanup │  │ health  │
            └────────┘  └─────────┘
```

Правило: модули импортируют только то, что им нужно. Циклических зависимостей нет.

## 4. DTO, Services, Controllers, Guards

### Auth
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `register.dto.ts` | email, password, confirmPassword, name? |
| DTO | `login.dto.ts` | email, password |
| DTO | `auth-response.dto.ts` | accessToken, user (без пароля) |
| Service | `auth.service.ts` | register, login, logout, refreshTokens, validateUser |
| Controller | `auth.controller.ts` | POST /auth/register, POST /auth/login, POST /auth/logout, POST /auth/refresh |
| Strategy | `jwt.strategy.ts` | Валидация access token из Authorization header |
| Strategy | `jwt-refresh.strategy.ts` | Валидация refresh token из cookie |
| Guard | `jwt-auth.guard.ts` | Защита endpoints, требующих авторизации |
| Guard | `jwt-refresh.guard.ts` | Защита endpoint refresh |
| Guard | `roles.guard.ts` | Проверка роли (USER/ADMIN) |
| Decorator | `current-user.decorator.ts` | Извлечение user из request |
| Decorator | `public.decorator.ts` | Пометка endpoint как публичного |
| Decorator | `roles.decorator.ts` | Указание требуемых ролей |

### Users
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `create-user.dto.ts` | email, passwordHash, name?, role? |
| DTO | `update-user.dto.ts` | name?, isActive? |
| Service | `users.service.ts` | create, findByEmail, findById, update, checkEmailUnique |

### Profile
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `update-profile.dto.ts` | name? |
| DTO | `change-password.dto.ts` | currentPassword, newPassword, confirmNewPassword |
| DTO | `profile-response.dto.ts` | id, email, name, stats, createdAt |
| Service | `profile.service.ts` | getProfile, updateProfile, changePassword, getStats |
| Controller | `profile.controller.ts` | GET /profile, PATCH /profile, POST /profile/change-password |

### Files
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `upload-file.dto.ts` | operationType, targetFormat?, options? |
| DTO | `file-response.dto.ts` | jobId, status, originalFilename |
| Pipe | `file-validation.pipe.ts` | Проверка MIME, размера, расширения |
| Service | `files.service.ts` | upload, download, validateFile |
| Controller | `files.controller.ts` | POST /files/upload, GET /files/:jobId/download |

### Storage
| Тип | Файл | Назначение |
|-----|------|------------|
| Service | `storage.service.ts` | saveToTemp, moveToOriginal, moveToProcessed, moveToFailed, delete, getReadStream, generateSafeName, getFullPath |
| Constants | `storage.constants.ts` | Пути директорий, лимиты |

### Jobs
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `create-job.dto.ts` | userId?, originalFilename, storedPath, mimeType, fileSize, operationType, sourceFormat, targetFormat?, options? |
| DTO | `job-status.dto.ts` | id, status, progress?, errorMessage? |
| DTO | `job-response.dto.ts` | Полная информация о задаче |
| Service | `jobs.service.ts` | create, findById, updateStatus, getByUser, acquireNext (для worker), releaseStale |
| Controller | `jobs.controller.ts` | GET /jobs/:id/status, GET /jobs (список для пользователя) |

### History
| Тип | Файл | Назначение |
|-----|------|------------|
| DTO | `history-query.dto.ts` | page, limit, status?, operationType?, dateFrom?, dateTo?, sortBy? |
| DTO | `history-response.dto.ts` | Пагинированный список с метаданными |
| Service | `history.service.ts` | getHistory, deleteEntry, clearAll, getRepeatData |
| Controller | `history.controller.ts` | GET /history, DELETE /history/:id, DELETE /history, POST /history/:id/repeat |

### Audit Log
| Тип | Файл | Назначение |
|-----|------|------------|
| Service | `audit-log.service.ts` | log(action, userId?, entityType?, entityId?, ip?, userAgent?, metadata?) |
Контроллера нет — сервис используется другими модулями через DI.

### Health
| Тип | Файл | Назначение |
|-----|------|------------|
| Controller | `health.controller.ts` | GET /health — статус БД, диска, uptime |

### Cleanup
| Тип | Файл | Назначение |
|-----|------|------------|
| Service | `cleanup.service.ts` | cleanExpiredFiles, cleanExpiredSessions, cleanStaleJobs, cleanOldAuditLogs (все через @Cron) |

## 5. Middleware, Interceptors, Filters

### Middleware

| Файл | Назначение | Применение |
|------|------------|------------|
| `request-id.middleware.ts` | Генерирует UUID для каждого запроса, добавляет в headers (`X-Request-Id`). Нужен для трассировки логов | Глобально через `configure()` в AppModule |

### Interceptors

| Файл | Назначение | Применение |
|------|------------|------------|
| `logging.interceptor.ts` | Логирует: метод, URL, время выполнения, статус ответа, request-id. Не логирует тело запроса (может содержать пароли) | Глобально через `APP_INTERCEPTOR` |
| `transform-response.interceptor.ts` | Оборачивает все ответы в единый формат: `{ success: true, data: ..., meta?: ... }`. Ошибки оборачиваются в filters | Глобально через `APP_INTERCEPTOR` |

### Filters

| Файл | Назначение | Применение |
|------|------------|------------|
| `all-exceptions.filter.ts` | Ловит все необработанные исключения. Формирует ответ: `{ success: false, error: { code, message, details? } }`. Логирует stack trace на сервере, клиенту отдаёт только безопасное сообщение | Глобально через `APP_FILTER` |
| `prisma-exception.filter.ts` | Перехватывает Prisma-ошибки (P2002 unique violation, P2025 not found и т.д.) и преобразует в HTTP-ответы с понятными сообщениями | Глобально через `APP_FILTER` |

### Формат ответов API

Успех:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

Ошибка:
```json
{
  "success": false,
  "error": {
    "code": "EMAIL_ALREADY_EXISTS",
    "message": "Пользователь с таким email уже существует",
    "statusCode": 409
  }
}
```

## 6. Пример app.module.ts

Полный файл: `apps/api/src/app.module.ts`

Ключевые решения:
- `ConfigModule.forRoot({ isGlobal: true })` — конфигурация доступна везде без повторного импорта
- `PrismaModule` помечен `@Global()` — PrismaService доступен во всех модулях
- `AuditLogModule` помечен `@Global()` — AuditLogService доступен везде
- `ThrottlerGuard` подключен глобально через SecurityModule
- Filters и interceptors подключены через `APP_FILTER` / `APP_INTERCEPTOR` providers
- `ScheduleModule.forRoot()` включает cron-задачи из CleanupService

## 7. План создания backend по шагам

### Шаг 1: Инициализация проекта
```bash
# В папке apps/api
npm init -y
npm install @nestjs/core @nestjs/common @nestjs/platform-express
npm install @nestjs/config @nestjs/passport @nestjs/jwt @nestjs/schedule @nestjs/throttler
npm install @prisma/client passport passport-jwt
npm install class-validator class-transformer
npm install argon2 cookie-parser helmet
npm install -D @nestjs/cli typescript @types/node @types/express
npm install -D prisma @types/passport-jwt @types/cookie-parser @types/multer
npm install -D ts-node tsconfig-paths
```

### Шаг 2: Prisma и БД
- Скопировать schema.prisma (уже создан)
- `npx prisma migrate dev --name init`
- Создать seed.ts
- Проверить подключение через health endpoint

### Шаг 3: Common-слой
- Создать filters, interceptors, middleware (уже созданы)
- Создать interfaces, constants, dto
- Проверить, что формат ответов единообразный

### Шаг 4: Auth модуль
- Реализовать register, login, logout, refresh (промт 4)
- Проверить JWT стратегии
- Проверить guards
- Проверить rate limiting на auth endpoints

### Шаг 5: Users + Profile
- Проверить CRUD пользователей
- Проверить уникальность email
- Реализовать профиль и статистику

### Шаг 6: Storage модуль
- Проверить создание директорий
- Проверить генерацию безопасных имён
- Проверить перемещение файлов

### Шаг 7: Files + Jobs
- Реализовать upload с Multer
- Реализовать создание задач
- Реализовать download с проверкой прав
- Проверить polling статуса

### Шаг 8: History
- Реализовать пагинированный список
- Реализовать фильтрацию
- Реализовать удаление и очистку
- Реализовать повтор операции

### Шаг 9: Cleanup
- Проверить cron-задачи
- Проверить очистку файлов
- Проверить recovery зависших задач

### Шаг 10: Интеграционная проверка
- Полный flow: register → login → upload → check status → download → history
- Проверить все error cases
- Проверить rate limiting
- Проверить формат ответов
