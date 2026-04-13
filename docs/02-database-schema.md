# Схема базы данных «Универсальная мастерская файлов»

## 1. ER-модель

```
┌──────────────────┐       ┌──────────────────────┐
│      users       │       │    user_sessions      │
├──────────────────┤       ├──────────────────────┤
│ id          (PK) │──┐    │ id              (PK) │
│ email    (UNIQUE)│  │    │ user_id         (FK) │◀─┐
│ password_hash    │  │    │ refresh_token_hash   │  │
│ name             │  ├───▶│ ip_address           │  │
│ role             │  │    │ user_agent           │  │
│ is_active        │  │    │ expires_at           │  │
│ created_at       │  │    │ created_at           │  │
│ updated_at       │  │    │ revoked_at           │  │
│ last_login_at    │  │    └──────────────────────┘  │
└──────────────────┘  │                               │
                      │    ┌──────────────────────┐   │
                      │    │     file_jobs         │   │
                      │    ├──────────────────────┤   │
                      ├───▶│ id              (PK) │   │
                      │    │ user_id    (FK, null) │   │
                      │    │ original_filename     │   │
                      │    │ stored_original_path  │   │
                      │    │ output_filename       │   │
                      │    │ stored_output_path    │   │
                      │    │ mime_type             │   │
                      │    │ file_size_before      │   │
                      │    │ file_size_after       │   │
                      │    │ operation_type        │   │
                      │    │ source_format         │   │
                      │    │ target_format         │   │
                      │    │ status                │   │
                      │    │ error_message         │   │
                      │    │ retry_count           │   │
                      │    │ max_retries           │   │
                      │    │ priority              │   │
                      │    │ locked_at             │   │
                      │    │ locked_by             │   │
                      │    │ created_at            │   │
                      │    │ started_at            │   │
                      │    │ completed_at          │   │
                      │    │ expires_at            │   │
                      │    │ deleted_at            │   │
                      │    └───────┬──────────────┘   │
                      │            │                   │
                      │            ▼                   │
                      │    ┌──────────────────────┐   │
                      │    │    job_options        │   │
                      │    ├──────────────────────┤   │
                      │    │ id              (PK) │   │
                      │    │ file_job_id     (FK) │   │
                      │    │ option_key           │   │
                      │    │ option_value         │   │
                      │    └──────────────────────┘   │
                      │                               │
                      │    ┌──────────────────────┐   │
                      │    │    audit_logs         │   │
                      │    ├──────────────────────┤   │
                      ├───▶│ id              (PK) │   │
                           │ user_id    (FK, null) │   │
                           │ action               │   │
                           │ entity_type          │   │
                           │ entity_id            │   │
                           │ ip_address           │   │
                           │ user_agent           │   │
                           │ metadata             │   │
                           │ created_at           │   │
                           └──────────────────────┘

  Таблицы для будущей монетизации:

  ┌──────────────────────┐       ┌──────────────────────┐
  │   billing_plans      │       │  user_subscriptions   │
  ├──────────────────────┤       ├──────────────────────┤
  │ id              (PK) │◀──────│ id              (PK) │
  │ name                 │       │ user_id         (FK) │◀── users
  │ slug          (UNIQ) │       │ plan_id         (FK) │
  │ description          │       │ status               │
  │ price_monthly        │       │ started_at           │
  │ price_yearly         │       │ expires_at           │
  │ limits               │       │ canceled_at          │
  │ features             │       │ created_at           │
  │ is_active            │       │ updated_at           │
  │ sort_order           │       └──────────────────────┘
  │ created_at           │
  │ updated_at           │
  └──────────────────────┘
```

### Связи:

| Связь | Тип | ON DELETE |
|-------|-----|----------|
| users → user_sessions | 1:N | CASCADE (удаление пользователя удаляет сессии) |
| users → file_jobs | 1:N | SET NULL (задачи остаются для статистики) |
| users → audit_logs | 1:N | SET NULL (логи остаются) |
| file_jobs → job_options | 1:N | CASCADE (удаление задачи удаляет опции) |
| users → user_subscriptions | 1:N | CASCADE |
| billing_plans → user_subscriptions | 1:N | RESTRICT (нельзя удалить план с подписками) |

## 2. Prisma Schema

Полная schema находится в `apps/api/prisma/schema.prisma`.

## 3. Пояснения по каждому полю

### Таблица `users`

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | Генерируется на стороне БД. UUID вместо auto-increment — безопаснее (нельзя угадать ID другого пользователя) |
| `email` | VARCHAR(255), UNIQUE | Основной идентификатор для входа. UNIQUE INDEX на уровне БД гарантирует уникальность даже при race condition |
| `password_hash` | VARCHAR(255) | Хэш пароля через Argon2id. Никогда не хранить пароль в открытом виде. Argon2id выбран как рекомендация OWASP |
| `name` | VARCHAR(100), nullable | Отображаемое имя. Необязательное — пользователь может заполнить позже |
| `role` | ENUM(USER, ADMIN) | Роль в системе. Default: USER. ADMIN для будущей админ-панели |
| `is_active` | BOOLEAN | Мягкая блокировка аккаунта без удаления данных. Заблокированный пользователь не может войти |
| `created_at` | TIMESTAMP | Дата регистрации. Автоматически при создании |
| `updated_at` | TIMESTAMP | Автоматически обновляется Prisma при любом изменении записи |
| `last_login_at` | TIMESTAMP, nullable | Обновляется при каждом успешном входе. Полезно для аналитики и cleanup неактивных аккаунтов |

### Таблица `user_sessions`

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK сессии |
| `user_id` | UUID, FK | Ссылка на пользователя. CASCADE — при удалении пользователя все сессии удаляются |
| `refresh_token_hash` | VARCHAR(255) | SHA-256 хэш refresh token. Сам token хранится только в httpOnly cookie клиента. Даже при утечке БД токены бесполезны |
| `ip_address` | VARCHAR(45), nullable | IPv4 или IPv6. Для аудита и обнаружения подозрительных входов |
| `user_agent` | VARCHAR(512), nullable | Браузер/устройство. Для отображения активных сессий в профиле |
| `expires_at` | TIMESTAMP | Срок действия refresh token (обычно 7-30 дней). После этого сессия невалидна |
| `created_at` | TIMESTAMP | Когда создана сессия |
| `revoked_at` | TIMESTAMP, nullable | Когда сессия отозвана (logout). NULL = активная сессия. Позволяет отличить истёкшие от явно отозванных |

### Таблица `file_jobs`

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK задачи |
| `user_id` | UUID, FK, nullable | NULL для анонимных операций (если будут разрешены). SET NULL при удалении пользователя — задачи остаются для статистики |
| `original_filename` | VARCHAR(255) | Имя файла от пользователя. Только для отображения, никогда не используется в путях ФС |
| `stored_original_path` | VARCHAR(500) | Относительный путь к оригиналу в storage (например `original/2025/04/uuid.jpg`). Относительный — чтобы можно было перенести storage |
| `output_filename` | VARCHAR(255), nullable | Имя файла для скачивания. Формируется backend-ом. NULL пока задача не завершена |
| `stored_output_path` | VARCHAR(500), nullable | Путь к результату. NULL пока не обработано |
| `mime_type` | VARCHAR(127) | Реальный MIME-тип, определённый через magic bytes, а не по расширению |
| `file_size_before` | BIGINT | Размер исходного файла в байтах. BIGINT — файлы могут быть больше 2 ГБ |
| `file_size_after` | BIGINT, nullable | Размер результата. NULL до завершения. Позволяет показать «сэкономлено X%» |
| `operation_type` | VARCHAR(100) | Тип операции: `image.convert`, `image.resize`, `pdf.merge`, `pdf.split`, `doc.convert` и т.д. Формат `категория.действие` для удобной фильтрации |
| `source_format` | VARCHAR(20) | Исходный формат: `jpg`, `png`, `pdf`, `docx` и т.д. |
| `target_format` | VARCHAR(20), nullable | Целевой формат. NULL для операций без смены формата (compress, rotate) |
| `status` | ENUM | `QUEUED` → `PROCESSING` → `DONE` / `ERROR` / `CANCELED`. Конечный автомат задачи |
| `error_message` | TEXT, nullable | Описание ошибки для пользователя. Без технических деталей — те идут в серверные логи |
| `retry_count` | INT, default 0 | Сколько раз задача была перезапущена. Инкрементируется при каждом retry |
| `max_retries` | INT, default 3 | Максимум попыток. После превышения — статус ERROR без повторов |
| `priority` | INT, default 0 | Приоритет в очереди. 0 = обычный. Платные пользователи могут получить priority > 0 |
| `locked_at` | TIMESTAMP, nullable | Когда worker взял задачу. Для обнаружения зависших задач (stale lock detection) |
| `locked_by` | VARCHAR(100), nullable | Идентификатор worker-а (hostname или PID). Для диагностики при нескольких worker-ах |
| `created_at` | TIMESTAMP | Когда задача создана |
| `started_at` | TIMESTAMP, nullable | Когда worker начал обработку |
| `completed_at` | TIMESTAMP, nullable | Когда обработка завершена (успешно или с ошибкой) |
| `expires_at` | TIMESTAMP, nullable | Когда файлы задачи будут удалены. Зависит от тарифа: анонимные — 24ч, free — 7 дней, платные — 30+ дней |
| `deleted_at` | TIMESTAMP, nullable | Soft delete. Пользователь удалил из истории, но физически запись остаётся для аудита. Cleanup cron удалит позже |

### Таблица `job_options`

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK |
| `file_job_id` | UUID, FK | Ссылка на задачу. CASCADE — удаление задачи удаляет опции |
| `option_key` | VARCHAR(100) | Ключ параметра: `quality`, `width`, `height`, `pages`, `rotation`, `format` и т.д. |
| `option_value` | VARCHAR(1000) | Значение параметра. Строка — универсальный формат. Парсинг на стороне handler-а |

Почему key-value, а не JSONB в file_jobs: отдельная таблица позволяет индексировать по ключам, делать выборки «все задачи с quality > 80», и расширять без миграций основной таблицы.

### Таблица `audit_logs`

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK |
| `user_id` | UUID, FK, nullable | NULL для анонимных действий. SET NULL при удалении пользователя |
| `action` | VARCHAR(100) | Действие: `register`, `login`, `login_failed`, `logout`, `upload`, `download`, `delete_history`, `clear_history`, `password_change` |
| `entity_type` | VARCHAR(50), nullable | Тип сущности: `user`, `file_job`, `session`. Для связи с конкретным объектом |
| `entity_id` | UUID, nullable | ID сущности, над которой выполнено действие |
| `ip_address` | VARCHAR(45), nullable | IP клиента |
| `user_agent` | VARCHAR(512), nullable | Браузер/устройство |
| `metadata` | JSONB, nullable | Произвольные данные: причина блокировки, старый email при смене, количество удалённых записей и т.д. |
| `created_at` | TIMESTAMP | Время действия |

### Таблица `billing_plans` (future-ready)

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK |
| `name` | VARCHAR(50) | Название: Free, Plus, Pro, Business |
| `slug` | VARCHAR(50), UNIQUE | URL-friendly идентификатор: `free`, `plus`, `pro`, `business` |
| `description` | TEXT, nullable | Описание тарифа для UI |
| `price_monthly` | INT, default 0 | Цена в копейках/центах за месяц. INT вместо DECIMAL — проще и нет проблем с округлением |
| `price_yearly` | INT, default 0 | Цена за год |
| `limits` | JSONB | Лимиты: `{"max_file_size_mb": 25, "daily_operations": 10, "history_days": 7, "batch_enabled": false}` |
| `features` | JSONB | Список фич: `["basic_convert", "image_resize", "pdf_merge"]` |
| `is_active` | BOOLEAN | Можно деактивировать тариф без удаления |
| `sort_order` | INT | Порядок отображения на странице тарифов |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### Таблица `user_subscriptions` (future-ready)

| Поле | Тип | Пояснение |
|------|-----|-----------|
| `id` | UUID | PK |
| `user_id` | UUID, FK | CASCADE при удалении пользователя |
| `plan_id` | UUID, FK | RESTRICT — нельзя удалить план, если есть подписки |
| `status` | ENUM | ACTIVE, CANCELED, EXPIRED, PAST_DUE |
| `started_at` | TIMESTAMP | Начало подписки |
| `expires_at` | TIMESTAMP, nullable | Когда истекает. NULL = бессрочная (free) |
| `canceled_at` | TIMESTAMP, nullable | Когда отменена |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

## 4. Индексы

| Таблица | Индекс | Тип | Назначение |
|---------|--------|-----|------------|
| `users` | `email` | UNIQUE | Гарантия уникальности email, быстрый поиск при логине |
| `user_sessions` | `user_id` | B-tree | Получение всех сессий пользователя |
| `user_sessions` | `expires_at` | B-tree | Cleanup просроченных сессий |
| `file_jobs` | `user_id, created_at DESC` | Composite | История пользователя с сортировкой по дате |
| `file_jobs` | `status, created_at` | Composite | Выборка задач по статусу |
| `file_jobs` | `status, priority, created_at` | Composite (idx_worker_polling) | Worker polling: берёт QUEUED задачи с наивысшим приоритетом, самые старые первыми |
| `file_jobs` | `expires_at` | B-tree | Cleanup просроченных файлов |
| `file_jobs` | `deleted_at` | B-tree | Фильтрация soft-deleted записей |
| `job_options` | `file_job_id` | B-tree | Получение опций задачи |
| `audit_logs` | `user_id, created_at DESC` | Composite | Аудит по пользователю |
| `audit_logs` | `action, created_at DESC` | Composite | Аудит по типу действия |
| `audit_logs` | `entity_type, entity_id` | Composite | Аудит по конкретной сущности |
| `audit_logs` | `created_at` | B-tree | Cleanup старых логов |
| `billing_plans` | `slug` | UNIQUE | Поиск тарифа по slug |
| `user_subscriptions` | `user_id` | B-tree | Подписки пользователя |
| `user_subscriptions` | `user_id, status` | Composite | Активная подписка пользователя |

## 5. Ограничения (Constraints)

| Ограничение | Таблица | Описание |
|-------------|---------|----------|
| UNIQUE email | `users` | Один аккаунт на email. Проверяется и в коде (для понятной ошибки), и в БД (для race condition) |
| UNIQUE slug | `billing_plans` | Один slug на тариф |
| FK user_id CASCADE | `user_sessions` | Удаление пользователя каскадно удаляет сессии |
| FK user_id SET NULL | `file_jobs` | Удаление пользователя не удаляет задачи (статистика) |
| FK user_id SET NULL | `audit_logs` | Логи сохраняются после удаления пользователя |
| FK file_job_id CASCADE | `job_options` | Опции удаляются вместе с задачей |
| FK plan_id RESTRICT | `user_subscriptions` | Нельзя удалить тариф с активными подписками |
| CHECK retry_count >= 0 | `file_jobs` | Через raw SQL миграцию, Prisma не поддерживает CHECK нативно |
| CHECK file_size_before > 0 | `file_jobs` | Файл не может быть пустым |

Примечание: CHECK constraints добавляются через `prisma migrate` с кастомной SQL-миграцией, так как Prisma ORM не поддерживает их декларативно.

## 6. Уникальные поля

| Таблица | Поле | Обоснование |
|---------|------|-------------|
| `users` | `email` | Основной идентификатор для входа. Дубликаты недопустимы |
| `billing_plans` | `slug` | Используется в URL и API. Должен быть уникальным |
| Все таблицы | `id` (UUID) | PK, уникален по определению |

## 7. Таблицы для очистки по cron

| Таблица | Условие очистки | Частота | Действие |
|---------|----------------|---------|----------|
| `user_sessions` | `expires_at < NOW()` или `revoked_at IS NOT NULL AND revoked_at < NOW() - 30 days` | Каждый час | DELETE — физическое удаление просроченных/отозванных сессий |
| `file_jobs` | `expires_at < NOW() AND expires_at IS NOT NULL` | Каждый час | Удалить файлы с диска, затем DELETE записи (или пометить deleted_at) |
| `file_jobs` | `deleted_at IS NOT NULL AND deleted_at < NOW() - 90 days` | Раз в сутки | Физическое удаление soft-deleted записей старше 90 дней |
| `file_jobs` | `status = 'QUEUED' AND created_at < NOW() - 24 hours` | Каждый час | Пометить как ERROR — задача зависла |
| `file_jobs` | `status = 'PROCESSING' AND locked_at < NOW() - 10 minutes` | Каждые 5 минут | Stale lock recovery: вернуть в QUEUED если retry_count < max_retries, иначе ERROR |
| `audit_logs` | `created_at < NOW() - 365 days` | Раз в сутки | DELETE — логи старше года (или архивировать) |
| `storage/temp` | Файлы старше 1 часа | Каждые 15 минут | Удалить файлы из temp, которые не привязаны к job |
| `storage/failed` | Файлы старше 7 дней | Раз в сутки | Удалить файлы неудачных задач |

## 8. Рекомендации по миграциям

### Порядок создания таблиц:
1. `users` — базовая таблица, от неё зависят все остальные
2. `user_sessions` — зависит от users
3. `file_jobs` — зависит от users
4. `job_options` — зависит от file_jobs
5. `audit_logs` — зависит от users
6. `billing_plans` — независимая
7. `user_subscriptions` — зависит от users и billing_plans

### Практические рекомендации:

1. **Первая миграция** — создать все таблицы одной миграцией (`prisma migrate dev --name init`). Это проще для начального развёртывания.

2. **CHECK constraints** — добавить отдельной миграцией через `prisma migrate dev --create-only`, затем вручную дописать SQL:
   ```sql
   ALTER TABLE file_jobs ADD CONSTRAINT chk_file_size CHECK (file_size_before > 0);
   ALTER TABLE file_jobs ADD CONSTRAINT chk_retry_count CHECK (retry_count >= 0);
   ```

3. **Seed-данные** — создать `prisma/seed.ts`:
   - Тарифные планы (Free, Plus, Pro, Business) с дефолтными лимитами
   - Тестовый admin-пользователь (только для dev)

4. **Именование миграций** — использовать осмысленные имена:
   - `init` — начальная схема
   - `add_billing_tables` — добавление тарифов
   - `add_user_avatar` — новое поле
   - `idx_file_jobs_status` — добавление индекса

5. **Не менять существующие миграции** после применения на production. Только новые миграции.

6. **Бэкап перед миграцией** на production:
   ```bash
   pg_dump -U postgres file_workshop > backup_$(date +%Y%m%d_%H%M%S).sql
   prisma migrate deploy
   ```

7. **Тяжёлые миграции** (добавление индекса на большую таблицу) — использовать `CONCURRENTLY`:
   ```sql
   CREATE INDEX CONCURRENTLY idx_name ON table_name (column);
   ```
   Через `--create-only` + ручное редактирование SQL.

8. **Откат** — Prisma не поддерживает автоматический rollback. Для критичных миграций писать отдельный down-скрипт вручную и хранить рядом с миграцией.
