# Тест-план — «Универсальная мастерская файлов»

## 1. Test Strategy

### Пирамида тестирования:

```
          ┌─────────┐
          │  E2E    │  ~10% — критические user flows
          │  (5-10) │
         ┌┴─────────┴┐
         │Integration │  ~30% — API endpoints, DB, storage
         │  (30-50)   │
        ┌┴────────────┴┐
        │  Unit Tests   │  ~60% — сервисы, утилиты, валидация
        │  (100-150)    │
        └───────────────┘
```

### Инструменты:

| Уровень | Backend | Frontend |
|---------|---------|----------|
| Unit | Jest + ts-jest | Vitest + React Testing Library |
| Integration | Jest + Supertest + Prisma (test DB) | — |
| E2E | — | Playwright |

### Окружение:

- Отдельная PostgreSQL БД: `file_workshop_test`
- Отдельная storage директория: `storage_test/`
- `.env.test` с тестовыми секретами
- Миграции перед каждым тестовым прогоном
- Очистка БД между тестами (truncate)

### Что автоматизировать в первую очередь (по ROI):

1. Auth (register/login/logout/refresh) — ломается чаще всего при рефакторинге
2. Upload + MIME validation — критично для безопасности
3. Job lifecycle (create → process → complete/error) — ядро бизнес-логики
4. Access control (чужие файлы, чужая история) — security
5. History CRUD — часто используется пользователями
6. Image conversion (хотя бы JPG→PNG) — smoke test worker-а

## 2. Unit Tests

### Auth Service

| # | Тест | Ожидание |
|---|------|----------|
| U-AUTH-01 | register: валидные данные | Создаёт пользователя, возвращает accessToken + user |
| U-AUTH-02 | register: дублирующий email | ConflictException 409 |
| U-AUTH-03 | register: email приводится к lowercase | `Test@Mail.COM` → `test@mail.com` |
| U-AUTH-04 | register: пароль хэшируется Argon2id | passwordHash ≠ password, argon2.verify = true |
| U-AUTH-05 | login: верные данные | accessToken + user + refresh cookie |
| U-AUTH-06 | login: неверный пароль | UnauthorizedException, единое сообщение |
| U-AUTH-07 | login: несуществующий email | UnauthorizedException, то же сообщение (timing safe) |
| U-AUTH-08 | login: деактивированный аккаунт | ForbiddenException |
| U-AUTH-09 | logout: отзыв сессии | session.revokedAt ≠ null, cookie очищена |
| U-AUTH-10 | refreshTokens: валидная сессия | Новый accessToken, новая сессия, старая отозвана |
| U-AUTH-11 | refreshTokens: отозванная сессия | UnauthorizedException |
| U-AUTH-12 | refreshTokens: истёкшая сессия | UnauthorizedException |
| U-AUTH-13 | refreshTokens: деактивированный user | ForbiddenException, сессия отозвана |

### Users Service

| # | Тест | Ожидание |
|---|------|----------|
| U-USER-01 | create: уникальный email | Пользователь создан |
| U-USER-02 | create: дублирующий email | ConflictException |
| U-USER-03 | findByEmail: существующий | Возвращает user |
| U-USER-04 | findByEmail: несуществующий | null |
| U-USER-05 | findById: существующий | Возвращает user |
| U-USER-06 | updateLastLogin | lastLoginAt обновлён |

### Jobs Service

| # | Тест | Ожидание |
|---|------|----------|
| U-JOB-01 | create: с userId | Job создан, status=QUEUED, expiresAt=7 дней |
| U-JOB-02 | create: без userId (анонимный) | expiresAt=24 часа |
| U-JOB-03 | create: с options | JobOptions созданы |
| U-JOB-04 | completeJob | status=DONE, fileSizeAfter заполнен, lockedAt=null |
| U-JOB-05 | failJob | status=ERROR, errorMessage заполнен |
| U-JOB-06 | retryOrFail: retry < max | status=QUEUED, retryCount++ |
| U-JOB-07 | retryOrFail: retry >= max | status=ERROR |
| U-JOB-08 | cancelJob: QUEUED задача | status=CANCELED |
| U-JOB-09 | cancelJob: PROCESSING задача | null (нельзя отменить) |
| U-JOB-10 | cancelJob: чужая задача | null |
| U-JOB-11 | releaseStaleJobs: зависшая задача | status=QUEUED, retryCount++ |
| U-JOB-12 | releaseStaleJobs: превышен retry | status=ERROR |

### Storage Service

| # | Тест | Ожидание |
|---|------|----------|
| U-STOR-01 | generateSafeName | UUID + расширение, без спецсимволов |
| U-STOR-02 | generateSafeName: `../../etc/passwd` | UUID + `.bin` (path traversal нейтрализован) |
| U-STOR-03 | generateSafeName: null bytes | Удалены |
| U-STOR-04 | getFullPath: нормальное имя | Путь внутри директории |
| U-STOR-05 | getFullPath: `../secret.txt` | Exception (path traversal) |
| U-STOR-06 | validatePath: внутри storage | true |
| U-STOR-07 | validatePath: за пределами | false |
| U-STOR-08 | saveBuffer + getFileSize | Файл создан, размер совпадает |
| U-STOR-09 | moveFile | Файл перемещён, старый удалён |
| U-STOR-10 | deleteFile: существующий | Удалён |
| U-STOR-11 | deleteFile: несуществующий | Нет ошибки (ENOENT ignored) |

### MIME Validator

| # | Тест | Ожидание |
|---|------|----------|
| U-MIME-01 | JPEG magic bytes + image/jpeg | valid: true |
| U-MIME-02 | PNG magic bytes + image/png | valid: true |
| U-MIME-03 | PDF magic bytes + application/pdf | valid: true |
| U-MIME-04 | JPEG magic bytes + image/png (mismatch) | valid: false |
| U-MIME-05 | EXE magic bytes + image/jpeg | valid: false |
| U-MIME-06 | ZIP magic bytes + application/vnd...docx | valid: true (ZIP-based) |
| U-MIME-07 | Текстовый файл + text/plain | valid: true |
| U-MIME-08 | Бинарный файл + text/plain | valid: false |

### Filename Sanitizer

| # | Тест | Ожидание |
|---|------|----------|
| U-FN-01 | `photo.jpg` | `.jpg` |
| U-FN-02 | `../../etc/passwd` | `.bin` |
| U-FN-03 | `file\x00.exe.jpg` | `.jpg` (null byte удалён) |
| U-FN-04 | `.very_long_extension_name` | Обрезано до 10 символов |
| U-FN-05 | `no_extension` | `.bin` |
| U-FN-06 | generateOutputFilename: jpg→png | `photo.png` |

### Profile Service

| # | Тест | Ожидание |
|---|------|----------|
| U-PROF-01 | getProfile: существующий user | Возвращает данные без passwordHash |
| U-PROF-02 | getProfile: несуществующий | NotFoundException |
| U-PROF-03 | updateProfile: имя | Имя обновлено |
| U-PROF-04 | changePassword: верный текущий | Пароль изменён |
| U-PROF-05 | changePassword: неверный текущий | BadRequestException |
| U-PROF-06 | getStats | Возвращает counts и sizes |

### History Service

| # | Тест | Ожидание |
|---|------|----------|
| U-HIST-01 | getHistory: без фильтров | Все записи пользователя, пагинация |
| U-HIST-02 | getHistory: фильтр по статусу | Только DONE/ERROR |
| U-HIST-03 | getHistory: фильтр по типу операции | Только image.* |
| U-HIST-04 | getHistory: фильтр по дате | Диапазон |
| U-HIST-05 | getHistory: не показывает deleted_at | Soft-deleted скрыты |
| U-HIST-06 | deleteEntry: своя запись | deletedAt заполнен |
| U-HIST-07 | deleteEntry: чужая запись | ForbiddenException |
| U-HIST-08 | clearAll | Все записи пользователя помечены deleted |
| U-HIST-09 | getRepeatData | operationType + options |

### Image Handler (Worker)

| # | Тест | Ожидание |
|---|------|----------|
| U-IMG-01 | JPG → PNG | Файл создан, формат PNG |
| U-IMG-02 | PNG → JPG (quality=80) | Файл создан, размер < оригинала |
| U-IMG-03 | Resize (width=800) | Ширина результата = 800 |
| U-IMG-04 | Rotate 90° | Ширина и высота поменялись |
| U-IMG-05 | Remove EXIF | Метаданные отсутствуют |
| U-IMG-06 | Compress (quality=50) | Размер < оригинала |
| U-IMG-07 | Невалидный файл (не изображение) | Error |
| U-IMG-08 | HEIC → JPG (если sharp поддерживает) | Файл создан |

### PDF Handler (Worker)

| # | Тест | Ожидание |
|---|------|----------|
| U-PDF-01 | Compress (ebook) | Размер < оригинала |
| U-PDF-02 | Rotate 90° (все страницы) | Страницы повёрнуты |
| U-PDF-03 | Extract pages "1,3" | 2 страницы в результате |
| U-PDF-04 | Split (3 страницы) | ZIP с 3 PDF |
| U-PDF-05 | Remove metadata | Title/Author пусты |
| U-PDF-06 | Reorder "3,1,2" | Порядок изменён |
| U-PDF-07 | Reorder: неполный список | Error |
| U-PDF-08 | To images (PNG, 150dpi) | ZIP с PNG файлами |
| U-PDF-09 | Пустой PDF (0 страниц) | Error |

### Document Handler (Worker)

| # | Тест | Ожидание |
|---|------|----------|
| U-DOC-01 | DOCX → PDF | PDF создан |
| U-DOC-02 | Markdown → HTML | HTML создан |
| U-DOC-03 | HTML → Markdown | MD создан |
| U-DOC-04 | TXT → DOCX | DOCX создан |
| U-DOC-05 | Неподдерживаемая пара (jpg→mp3) | Error с перечислением доступных |

## 3. Integration Tests (API)

### Auth API

| # | Тест | Метод | URL | Ожидание |
|---|------|-------|-----|----------|
| I-AUTH-01 | Регистрация | POST | /api/auth/register | 201, accessToken, Set-Cookie |
| I-AUTH-02 | Регистрация: дубль email | POST | /api/auth/register | 409 |
| I-AUTH-03 | Регистрация: невалидный email | POST | /api/auth/register | 400 |
| I-AUTH-04 | Регистрация: слабый пароль | POST | /api/auth/register | 400 |
| I-AUTH-05 | Вход | POST | /api/auth/login | 200, accessToken, Set-Cookie |
| I-AUTH-06 | Вход: неверный пароль | POST | /api/auth/login | 401 |
| I-AUTH-07 | Выход | POST | /api/auth/logout | 200, cookie очищена |
| I-AUTH-08 | Refresh | POST | /api/auth/refresh | 200, новый accessToken |
| I-AUTH-09 | Refresh: без cookie | POST | /api/auth/refresh | 401 |
| I-AUTH-10 | Rate limit: 6 попыток login | POST | /api/auth/login ×6 | 429 на 6-й |
| I-AUTH-11 | Protected endpoint без токена | GET | /api/profile | 401 |
| I-AUTH-12 | Protected endpoint с токеном | GET | /api/profile | 200 |

### Files API

| # | Тест | Метод | URL | Ожидание |
|---|------|-------|-----|----------|
| I-FILE-01 | Upload JPG | POST | /api/files/upload | 200, jobId |
| I-FILE-02 | Upload без файла | POST | /api/files/upload | 400 |
| I-FILE-03 | Upload .exe | POST | /api/files/upload | 400 |
| I-FILE-04 | Upload >50MB | POST | /api/files/upload | 413 |
| I-FILE-05 | Upload пустой файл | POST | /api/files/upload | 400 |
| I-FILE-06 | Upload: MIME mismatch | POST | /api/files/upload | 400 |
| I-FILE-07 | Download: DONE задача | GET | /api/files/:id/download | 200, файл |
| I-FILE-08 | Download: чужая задача | GET | /api/files/:id/download | 403 |
| I-FILE-09 | Download: QUEUED задача | GET | /api/files/:id/download | 400 |
| I-FILE-10 | Download: несуществующая | GET | /api/files/:id/download | 404 |

### Jobs API

| # | Тест | Метод | URL | Ожидание |
|---|------|-------|-----|----------|
| I-JOB-01 | Статус своей задачи | GET | /api/jobs/:id/status | 200, status |
| I-JOB-02 | Статус чужой задачи | GET | /api/jobs/:id/status | NOT_FOUND |

### History API

| # | Тест | Метод | URL | Ожидание |
|---|------|-------|-----|----------|
| I-HIST-01 | Список истории | GET | /api/history | 200, items + meta |
| I-HIST-02 | Фильтр по статусу | GET | /api/history?status=DONE | Только DONE |
| I-HIST-03 | Пагинация | GET | /api/history?page=2&limit=5 | 5 записей, page=2 |
| I-HIST-04 | Удаление записи | DELETE | /api/history/:id | 200 |
| I-HIST-05 | Удаление чужой записи | DELETE | /api/history/:id | 403 |
| I-HIST-06 | Очистка всей истории | DELETE | /api/history | 200, count |
| I-HIST-07 | Повтор операции | POST | /api/history/:id/repeat | 200, repeatData |

### Profile API

| # | Тест | Метод | URL | Ожидание |
|---|------|-------|-----|----------|
| I-PROF-01 | Получение профиля | GET | /api/profile | 200, без passwordHash |
| I-PROF-02 | Обновление имени | PATCH | /api/profile | 200 |
| I-PROF-03 | Смена пароля | POST | /api/profile/change-password | 200 |
| I-PROF-04 | Смена пароля: неверный текущий | POST | /api/profile/change-password | 400 |
| I-PROF-05 | Статистика | GET | /api/profile/stats | 200, counts |

## 4. E2E Tests (Playwright)

| # | Сценарий | Шаги | Ожидание |
|---|----------|------|----------|
| E2E-01 | Регистрация → профиль | Открыть /auth/register → заполнить форму → submit | Redirect на /profile, имя в header |
| E2E-02 | Вход → профиль → выход | /auth/login → заполнить → submit → проверить профиль → выход | Redirect на главную, кнопка "Войти" |
| E2E-03 | Конвертация JPG→PNG | Вход → /tools/images/jpg-to-png → drag файл → "Обработать" → ждать DONE → "Скачать" | Файл скачан, размер > 0 |
| E2E-04 | Сжатие PDF | Вход → /tools/pdf/compress-pdf → upload → выбрать quality → обработать → скачать | Размер результата < оригинала |
| E2E-05 | История после конвертации | Выполнить E2E-03 → перейти в /profile/history | Запись с JPG→PNG, статус DONE |
| E2E-06 | Удаление из истории | /profile/history → нажать ✕ → подтвердить | Запись исчезла |
| E2E-07 | Смена пароля | /profile/settings → заполнить форму смены → submit → logout → login с новым паролем | Успешный вход |
| E2E-08 | Ошибка: неверный формат | /tools/images/jpg-to-png → загрузить .pdf | Сообщение "формат не поддерживается" |
| E2E-09 | Ошибка: не авторизован | Открыть /profile без входа | Redirect на /auth/login |
| E2E-10 | Главная → каталог → инструмент | / → клик "Изображения" → клик "JPG в PNG" | Страница инструмента с dropzone |

## 5. Негативные сценарии

### Auth

| # | Сценарий | Ожидание |
|---|----------|----------|
| N-01 | Регистрация с пустым email | 400, "Email обязателен" |
| N-02 | Регистрация с невалидным email (`not-email`) | 400, "Некорректный формат" |
| N-03 | Регистрация с паролем < 8 символов | 400, "Минимум 8 символов" |
| N-04 | Регистрация с паролем без цифры | 400, "Нужна цифра" |
| N-05 | Регистрация: пароль ≠ confirmPassword | 400, "Пароли не совпадают" |
| N-06 | Вход с несуществующим email | 401, "Неверный email или пароль" |
| N-07 | Вход с неверным паролем | 401, то же сообщение |
| N-08 | Refresh с истёкшим токеном | 401 |
| N-09 | Запрос с чужим JWT (подделка) | 401 |
| N-10 | 10 неудачных попыток входа | 429 (rate limit) |

### Upload

| # | Сценарий | Ожидание |
|---|----------|----------|
| N-11 | Upload без Authorization header | 401 |
| N-12 | Upload файла 100MB | 413 |
| N-13 | Upload .exe переименованного в .jpg | 400 (magic bytes mismatch) |
| N-14 | Upload с operationType `../../hack` | 400 (regex validation) |
| N-15 | Upload с null bytes в имени файла | 400 |
| N-16 | Upload пустого файла (0 bytes) | 400 |
| N-17 | Upload без поля operationType | 400 |
| N-18 | Upload 25 файлов (лимит 20) | 400 |

### Access Control

| # | Сценарий | Ожидание |
|---|----------|----------|
| N-19 | Download чужого файла | 403 |
| N-20 | Удаление чужой записи истории | 403 |
| N-21 | Просмотр статуса чужой задачи | NOT_FOUND (не 403, чтобы не раскрывать существование) |
| N-22 | Повтор чужой операции | 403 |
| N-23 | Прямой доступ к /storage/... | 404 (Nginx deny) |

### Worker

| # | Сценарий | Ожидание |
|---|----------|----------|
| N-24 | Неизвестный operationType | ERROR без retry |
| N-25 | Повреждённый файл (не изображение) | ERROR |
| N-26 | Таймаут обработки (>120с) | Retry → ERROR |
| N-27 | Worker crash во время обработки | Stale recovery → retry |

## 6. Пограничные случаи

| # | Случай | Ожидание |
|---|--------|----------|
| B-01 | Email с максимальной длиной (255 символов) | Принимается |
| B-02 | Email с unicode (тест@домен.рф) | Зависит от валидации — скорее всего 400 |
| B-03 | Пароль ровно 8 символов (минимум) | Принимается |
| B-04 | Пароль 128 символов (максимум) | Принимается |
| B-05 | Пароль 129 символов | 400 |
| B-06 | Имя файла 255 символов | Принимается (обрезается для download name) |
| B-07 | Имя файла с кириллицей | Принимается (UUID на сервере) |
| B-08 | Имя файла с emoji | Принимается |
| B-09 | Файл ровно 50MB (лимит) | Принимается |
| B-10 | Файл 50MB + 1 byte | 413 |
| B-11 | PDF с 0 страниц | ERROR |
| B-12 | PDF с 500 страниц (split) | Принимается (лимит) |
| B-13 | PDF с 501 страницей (split) | ERROR |
| B-14 | Resize width=1 (минимум) | Принимается |
| B-15 | Resize width=16384 (максимум) | Принимается |
| B-16 | Resize width=16385 | ERROR |
| B-17 | Quality=1 (минимум) | Принимается |
| B-18 | Quality=100 (максимум) | Принимается |
| B-19 | Pages="1" (одна страница extract) | Один PDF |
| B-20 | Pages="999" (несуществующая страница) | ERROR или пустой результат |
| B-21 | Reorder с дублирующимися номерами | ERROR |
| B-22 | Одновременная регистрация с одним email (race condition) | Один успех, один 409 (UNIQUE INDEX) |
| B-23 | Refresh token использован дважды (replay) | Второй раз — 401 (ротация) |
| B-24 | Upload во время shutdown worker-а | Job остаётся QUEUED, обработается после рестарта |
| B-25 | История: page=0 | Нормализуется в page=1 |
| B-26 | История: limit=1000 | Ограничивается до 100 |

## 7. Приоритеты автоматизации

### Фаза 1 (перед первым релизом):

```
Unit:
  ✅ AuthService (13 тестов)
  ✅ UsersService (6 тестов)
  ✅ StorageService — path traversal (5 тестов)
  ✅ MIME Validator (8 тестов)
  ✅ Filename Sanitizer (6 тестов)

Integration:
  ✅ Auth API (12 тестов)
  ✅ Files API — upload + download (10 тестов)
  ✅ Access control (5 тестов)

E2E:
  ✅ Регистрация → вход → конвертация → скачивание (1 тест)
  ✅ Ошибка: неверный формат (1 тест)
```

### Фаза 2 (после первых пользователей):

```
Unit:
  ✅ JobsService (12 тестов)
  ✅ HistoryService (9 тестов)
  ✅ ProfileService (6 тестов)
  ✅ Image Handler — основные конвертации (8 тестов)

Integration:
  ✅ History API (7 тестов)
  ✅ Profile API (5 тестов)
  ✅ Jobs API (2 теста)

E2E:
  ✅ Полный flow с историей (E2E-03 + E2E-05)
  ✅ Смена пароля (E2E-07)
```

### Фаза 3 (стабилизация):

```
Unit:
  ✅ PDF Handler (9 тестов)
  ✅ Document Handler (5 тестов)
  ✅ CleanupService (4 теста)

Integration:
  ✅ Rate limiting (2 теста)
  ✅ Batch upload (2 теста)

E2E:
  ✅ Все оставшиеся E2E сценарии
  ✅ Негативные сценарии в UI
```

## 8. Примеры тест-кейсов (сводная таблица)

| ID | Модуль | Уровень | Описание | Приоритет | Автоматизация |
|----|--------|---------|----------|-----------|---------------|
| TC-001 | Auth | Unit | Регистрация с валидными данными | P0 | Фаза 1 |
| TC-002 | Auth | Unit | Дублирующий email | P0 | Фаза 1 |
| TC-003 | Auth | Unit | Timing-safe login (несуществующий email) | P0 | Фаза 1 |
| TC-004 | Auth | Integration | Rate limit на login (429) | P1 | Фаза 2 |
| TC-005 | Auth | E2E | Регистрация → профиль | P0 | Фаза 1 |
| TC-006 | Upload | Unit | MIME mismatch (EXE→JPG) | P0 | Фаза 1 |
| TC-007 | Upload | Unit | Path traversal в имени файла | P0 | Фаза 1 |
| TC-008 | Upload | Integration | Upload + job creation | P0 | Фаза 1 |
| TC-009 | Upload | Integration | Upload >50MB | P1 | Фаза 1 |
| TC-010 | Access | Integration | Download чужого файла (403) | P0 | Фаза 1 |
| TC-011 | Jobs | Unit | Job lifecycle: QUEUED→PROCESSING→DONE | P0 | Фаза 2 |
| TC-012 | Jobs | Unit | Stale job recovery | P1 | Фаза 2 |
| TC-013 | Worker | Unit | JPG→PNG conversion | P1 | Фаза 2 |
| TC-014 | Worker | Unit | PDF compress | P1 | Фаза 2 |
| TC-015 | Worker | Unit | DOCX→PDF | P2 | Фаза 3 |
| TC-016 | History | Integration | Список с фильтрами | P1 | Фаза 2 |
| TC-017 | History | Integration | Удаление чужой записи (403) | P0 | Фаза 2 |
| TC-018 | Profile | Integration | Смена пароля | P1 | Фаза 2 |
| TC-019 | Cleanup | Unit | Очистка expired файлов | P2 | Фаза 3 |
| TC-020 | E2E | E2E | Полный flow: upload→process→download→history | P0 | Фаза 1 |
| TC-021 | Security | Integration | Прямой доступ к /storage (404) | P0 | Фаза 1 |
| TC-022 | Boundary | Unit | Файл ровно 50MB | P2 | Фаза 3 |
| TC-023 | Boundary | Unit | Race condition: дубль email | P1 | Фаза 2 |
| TC-024 | Boundary | Unit | Refresh token replay | P1 | Фаза 2 |
| TC-025 | Batch | Integration | Upload 20 файлов | P2 | Фаза 3 |
