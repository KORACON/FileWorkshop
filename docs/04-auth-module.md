# Auth-модуль — полная документация

## 1. Список файлов

```
apps/api/src/modules/auth/
├── auth.module.ts              # Определение модуля, импорты
├── auth.controller.ts          # 7 endpoints с rate limiting
├── auth.service.ts             # Вся бизнес-логика auth
├── strategies/
│   ├── jwt.strategy.ts         # Валидация access token (Bearer header)
│   └── jwt-refresh.strategy.ts # Валидация refresh token (httpOnly cookie)
├── guards/
│   ├── jwt-auth.guard.ts       # Защита endpoints (с поддержкой @Public)
│   ├── jwt-refresh.guard.ts    # Защита refresh endpoint
│   └── roles.guard.ts          # Проверка ролей (USER/ADMIN)
├── decorators/
│   ├── current-user.decorator.ts # Извлечение user из request
│   ├── public.decorator.ts       # Пометка endpoint как публичного
│   ├── roles.decorator.ts        # Указание требуемых ролей
│   └── match.decorator.ts        # Валидатор совпадения полей (confirmPassword)
└── dto/
    ├── register.dto.ts           # Валидация регистрации
    ├── login.dto.ts              # Валидация входа
    └── auth-response.dto.ts      # Формат ответа
```

## 2. API Endpoints

| Метод | URL | Auth | Rate Limit | Описание |
|-------|-----|------|------------|----------|
| POST | /api/auth/register | Нет | 5/мин | Регистрация |
| POST | /api/auth/login | Нет | 5/мин | Вход |
| POST | /api/auth/logout | JWT | Общий | Выход |
| POST | /api/auth/refresh | Cookie | Общий | Обновление токенов |
| GET | /api/auth/sessions | JWT | Общий | Список активных сессий |
| DELETE | /api/auth/sessions/:id | JWT | Общий | Отзыв конкретной сессии |
| DELETE | /api/auth/sessions | JWT | Общий | Отзыв всех сессий кроме текущей |

## 3. Как работает уникальность email

### Два уровня защиты:

**Уровень 1 — Backend (UsersService.create)**
```
1. Приходит запрос на регистрацию с email
2. UsersService.findByEmail(email) → проверяет, есть ли пользователь
3. Если есть → ConflictException (409)
4. Если нет → создаёт пользователя
```
Этот уровень даёт понятное сообщение об ошибке пользователю.

**Уровень 2 — БД (UNIQUE INDEX)**
```sql
-- В Prisma schema:
model User {
  email String @unique
}

-- Генерирует в PostgreSQL:
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
```

Зачем два уровня:
- Backend-проверка: для user-friendly сообщения об ошибке
- БД-проверка: для защиты от race condition

**Race condition сценарий:**
```
Запрос A: findByEmail("test@mail.com") → null (нет такого)
Запрос B: findByEmail("test@mail.com") → null (нет такого)
Запрос A: INSERT → успех
Запрос B: INSERT → P2002 unique violation → PrismaExceptionFilter → 409
```

Без UNIQUE INDEX в БД оба запроса создали бы дубликат.

### Нормализация email:
- Все email приводятся к lowercase перед сохранением и поиском
- `dto.email.toLowerCase().trim()` в auth.service.ts
- `email.toLowerCase()` в users.service.ts

## 4. Схема работы токенов

```
┌─────────┐                    ┌─────────┐                    ┌──────┐
│ Browser │                    │ Backend │                    │  БД  │
└────┬────┘                    └────┬────┘                    └──┬───┘
     │                              │                            │
     │  POST /auth/login            │                            │
     │  {email, password}           │                            │
     │─────────────────────────────▶│                            │
     │                              │  findByEmail(email)        │
     │                              │───────────────────────────▶│
     │                              │◀───────────────────────────│
     │                              │                            │
     │                              │  argon2.verify(hash, pwd)  │
     │                              │                            │
     │                              │  Генерация:                │
     │                              │  - access token (JWT, 15m) │
     │                              │  - refresh token (JWT, 7d) │
     │                              │  - session ID (UUID)       │
     │                              │                            │
     │                              │  INSERT user_session       │
     │                              │  (id, user_id,             │
     │                              │   SHA256(refresh_token),   │
     │                              │   ip, user_agent,          │
     │                              │   expires_at)              │
     │                              │───────────────────────────▶│
     │                              │                            │
     │  Response:                   │                            │
     │  Body: { accessToken, user } │                            │
     │  Cookie: refresh_token       │                            │
     │  (httpOnly, secure, strict)  │                            │
     │◀─────────────────────────────│                            │
     │                              │                            │
     │  GET /api/profile            │                            │
     │  Authorization: Bearer <AT>  │                            │
     │─────────────────────────────▶│                            │
     │                              │  JwtStrategy.validate()    │
     │                              │  → { id, email, role }     │
     │                              │                            │
     │  Response: profile data      │                            │
     │◀─────────────────────────────│                            │
     │                              │                            │
     │  ... 15 минут спустя ...     │                            │
     │  Access token истёк          │                            │
     │                              │                            │
     │  POST /auth/refresh          │                            │
     │  Cookie: refresh_token       │                            │
     │─────────────────────────────▶│                            │
     │                              │  JwtRefreshStrategy:       │
     │                              │  извлекает из cookie,      │
     │                              │  валидирует JWT            │
     │                              │                            │
     │                              │  Проверка сессии в БД:     │
     │                              │  - не отозвана?            │
     │                              │  - не истекла?             │
     │                              │  - пользователь активен?   │
     │                              │───────────────────────────▶│
     │                              │◀───────────────────────────│
     │                              │                            │
     │                              │  РОТАЦИЯ:                  │
     │                              │  1. Отзыв старой сессии    │
     │                              │  2. Создание новой сессии  │
     │                              │  3. Новый access token     │
     │                              │  4. Новый refresh token    │
     │                              │───────────────────────────▶│
     │                              │                            │
     │  Response:                   │                            │
     │  Body: { accessToken, user } │                            │
     │  Cookie: новый refresh_token │                            │
     │◀─────────────────────────────│                            │
```

## 5. Безопасность auth-модуля

| Мера | Реализация |
|------|------------|
| Хэширование паролей | Argon2id (memoryCost: 64MB, timeCost: 3, parallelism: 4) |
| Хранение refresh token | SHA-256 хэш в БД. Сам токен только в httpOnly cookie |
| Timing attack protection | Фиктивный argon2.hash при несуществующем email |
| Cookie security | httpOnly, secure (prod), sameSite: strict (prod), path: /api/auth |
| Rate limiting | 5 попыток/мин на login и register |
| Ротация refresh token | При каждом refresh старый токен инвалидируется |
| Аудит | Все события: register, login, login_failed, logout |
| Ошибки | Единое сообщение «Неверный email или пароль» — не раскрываем что именно |
| Деактивация | isActive=false блокирует вход и refresh |
| Управление сессиями | Просмотр, отзыв одной, отзыв всех |

## 6. Переменные окружения

```env
# JWT секреты — ОБЯЗАТЕЛЬНО сменить в production
# Генерация: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=your-access-secret-min-64-chars-long-generated-randomly
JWT_REFRESH_SECRET=your-refresh-secret-min-64-chars-long-generated-randomly

# Время жизни токенов
JWT_ACCESS_EXPIRES_IN=15m    # Access token: 15 минут
JWT_REFRESH_EXPIRES_IN=7d    # Refresh token: 7 дней
```

Рекомендации:
- Access token: 15 минут — компромисс между UX и безопасностью
- Refresh token: 7 дней — пользователю не нужно логиниться каждый день
- Секреты: минимум 64 символа, криптографически случайные
- Разные секреты для access и refresh — компрометация одного не даёт доступ к другому
