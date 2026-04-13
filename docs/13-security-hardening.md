# Security Hardening — «Универсальная мастерская файлов»

## 1. Threat Model

```
┌─────────────────────────────────────────────────────────────────┐
│                        ATTACK SURFACE                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Internet                                                        │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────┐   T1: DDoS, brute force, injection                │
│  │  Nginx   │   T2: SSL stripping, header injection              │
│  │  :80/443 │                                                    │
│  └────┬─────┘                                                    │
│       │                                                          │
│  ┌────▼──────┐  T3: XSS, CSRF, auth bypass                     │
│  │ Next.js   │  T4: Sensitive data exposure in SSR               │
│  │  :3000    │                                                    │
│  └────┬──────┘                                                    │
│       │                                                          │
│  ┌────▼──────┐  T5: SQL injection, NoSQL injection               │
│  │ NestJS    │  T6: Broken auth, privilege escalation            │
│  │  :4000    │  T7: File upload attacks (RCE, XSS via file)     │
│  └────┬──────┘  T8: IDOR (access to other users' files)         │
│       │         T9: Rate limit bypass                            │
│  ┌────▼──────┐                                                    │
│  │ PostgreSQL│  T10: Data breach, SQL injection                  │
│  │  :5432    │  T11: Unencrypted backups                         │
│  └───────────┘                                                    │
│                                                                  │
│  ┌───────────┐  T12: Path traversal                              │
│  │ Storage   │  T13: Malicious file execution                    │
│  │ /storage/ │  T14: Archive bombs (zip bombs)                   │
│  └───────────┘  T15: Data leakage between users                  │
│                                                                  │
│  ┌───────────┐  T16: Worker crash → stale data                  │
│  │  Worker   │  T17: Resource exhaustion (CPU/RAM)               │
│  └───────────┘  T18: Command injection via filenames             │
│                                                                  │
│  ┌───────────┐  T19: Secrets in env/logs                         │
│  │  Server   │  T20: Unpatched OS/packages                       │
│  │  Ubuntu   │  T21: Unauthorized SSH access                     │
│  └───────────┘                                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Actors:
- Anonymous user (без регистрации)
- Authenticated user (зарегистрированный)
- Malicious user (целенаправленная атака)
- Automated bot (сканеры, brute force)
- Insider (доступ к серверу)

## 2. Риски по приоритету

| # | Риск | Приоритет | Влияние | Вероятность |
|---|------|-----------|---------|-------------|
| 1 | Загрузка вредоносного файла (RCE) | CRITICAL | Полный контроль сервера | Средняя |
| 2 | Path traversal через имена файлов | CRITICAL | Чтение/запись произвольных файлов | Средняя |
| 3 | SQL injection | CRITICAL | Утечка всей БД | Низкая (Prisma ORM) |
| 4 | Broken authentication (JWT leak) | CRITICAL | Доступ к чужим аккаунтам | Средняя |
| 5 | IDOR — доступ к чужим файлам | HIGH | Утечка пользовательских файлов | Высокая |
| 6 | Brute force login | HIGH | Компрометация аккаунтов | Высокая |
| 7 | XSS через имена файлов | HIGH | Кража сессий | Средняя |
| 8 | CSRF на state-changing endpoints | HIGH | Несанкционированные действия | Средняя |
| 9 | Archive bomb (zip bomb) | HIGH | DoS сервера | Средняя |
| 10 | Command injection через filenames | HIGH | RCE | Низкая |
| 11 | DDoS / resource exhaustion | MEDIUM | Недоступность сервиса | Высокая |
| 12 | Secrets exposure в логах | MEDIUM | Утечка ключей | Средняя |
| 13 | Unencrypted data at rest | MEDIUM | Утечка при физическом доступе | Низкая |
| 14 | Stale files / data retention | LOW | Юридические риски | Средняя |
| 15 | Unpatched dependencies | MEDIUM | Известные CVE | Высокая |

## 3. Технические меры

### 3.1. Nginx Hardening

```nginx
# /etc/nginx/sites-available/file-workshop

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=download:10m rate=30r/m;

# Connection limiting
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_stapling on;
    ssl_stapling_verify on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; frame-ancestors 'self';" always;

    # Limits
    client_max_body_size 55m;  # Чуть больше чем MAX_FILE_SIZE (50MB)
    limit_conn addr 20;        # Макс 20 соединений с одного IP

    # Скрыть версию Nginx
    server_tokens off;

    # Запрет доступа к скрытым файлам
    location ~ /\. {
        deny all;
        return 404;
    }

    # ЗАПРЕТ прямого доступа к storage
    location /storage {
        deny all;
        return 404;
    }

    # Auth endpoints — строгий rate limit
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload — rate limit + увеличенный таймаут
    location /api/files/upload {
        limit_req zone=upload burst=5 nodelay;
        client_max_body_size 55m;
        proxy_read_timeout 120s;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Download — rate limit
    location ~ /api/files/.*/download {
        limit_req zone=download burst=10 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API — общий rate limit
    location /api/ {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.2. NestJS Security (main.ts)

```typescript
// Уже реализовано в apps/api/src/main.ts:
app.use(helmet());                    // Security headers
app.use(cookieParser());              // Cookie parsing
app.enableCors({                      // CORS — только свой frontend
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
});
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,                    // Удаляет неизвестные поля
  forbidNonWhitelisted: true,         // Ошибка при лишних полях
  transform: true,
}));
```

### 3.3. CORS — конфигурация

```
Разрешённый origin: ТОЛЬКО https://example.com (или http://localhost:3000 в dev)
credentials: true (для httpOnly cookies)
methods: только нужные
allowedHeaders: только нужные
```

Почему строгий CORS:
- Запрещает запросы с чужих доменов
- Защищает от CSRF через fetch/XHR
- credentials: true + конкретный origin (не wildcard *)

### 3.4. CSRF Protection

Основная защита: `SameSite=Strict` cookie + CORS.

```
Refresh token cookie:
  httpOnly: true       → недоступен из JS (XSS не украдёт)
  secure: true         → только HTTPS
  sameSite: 'strict'   → не отправляется с чужих сайтов
  path: '/api/auth'    → только для auth endpoints
```

SameSite=Strict + CORS origin check = двойная защита от CSRF.
Дополнительный CSRF-token не нужен при этой конфигурации.

### 3.5. Secure Cookies

| Параметр | Значение | Зачем |
|----------|----------|-------|
| httpOnly | true | JS не может прочитать cookie (защита от XSS) |
| secure | true (prod) | Только HTTPS (защита от перехвата) |
| sameSite | strict (prod) | Не отправляется с чужих сайтов (CSRF) |
| path | /api/auth | Минимальный scope (не отправляется на другие endpoints) |
| maxAge | 7 дней | Автоматическое истечение |

### 3.6. Rate Limiting — полная конфигурация

| Endpoint | Лимит | Burst | Зачем |
|----------|-------|-------|-------|
| POST /auth/login | 5/мин | 3 | Brute force protection |
| POST /auth/register | 5/мин | 3 | Mass registration prevention |
| POST /files/upload | 10/мин | 5 | Upload abuse |
| GET /files/*/download | 30/мин | 10 | Download abuse |
| Все /api/* | 100/мин | 20 | General DoS protection |

Два уровня:
1. Nginx: `limit_req_zone` (по IP, быстрый, до backend не доходит)
2. NestJS: `@nestjs/throttler` (по IP + user, более гранулярный)

### 3.7. MIME Validation — 3 уровня

```
Уровень 1: Расширение файла
  → Whitelist: .jpg, .png, .pdf, .docx, ...
  → Проверка в FileValidationPipe

Уровень 2: Content-Type header
  → Whitelist: image/jpeg, application/pdf, ...
  → Проверка в FilesService.validateFile()

Уровень 3: Magic bytes (реальное содержимое)
  → Чтение первых 64 байт файла
  → Сравнение с известными сигнатурами
  → Несовпадение → файл в quarantine/
  → Реализовано в mime-validator.ts
```

### 3.8. Path Traversal Defense

```typescript
// Реализовано в StorageService:

// 1. Оригинальное имя файла НИКОГДА не используется в путях
//    UUID генерируется на сервере
generateSafeName(originalFilename) → "uuid.ext"

// 2. basename() перед любой операцией
const safeName = basename(filename);  // убирает ../

// 3. resolve() + startsWith() проверка
const fullPath = resolve(dirPath, safeName);
if (!fullPath.startsWith(resolve(dirPath))) {
  throw new Error('Path traversal attempt');
}

// 4. Расширение санитизируется: только [a-z0-9.]
ext = ext.replace(/[^a-z0-9.]/g, '');
```

### 3.9. Upload Restrictions

| Ограничение | Значение | Где проверяется |
|-------------|----------|-----------------|
| Максимальный размер файла | 50 MB | Nginx (client_max_body_size) + Multer (limits.fileSize) + FilesService |
| Максимум файлов за запрос | 20 | Multer (limits.files) |
| Whitelist расширений | 20 форматов | FileValidationPipe |
| Whitelist MIME | 20 типов | FilesService |
| Magic bytes проверка | Да | mime-validator.ts |
| Null bytes в имени | Запрещены | FileValidationPipe |
| Пустые файлы | Запрещены | FilesService |

### 3.10. Archive Bomb Defense

```typescript
// При распаковке ZIP (будущий модуль утилит):

// 1. Проверка ratio сжатия
const compressedSize = zipEntry.compressedSize;
const uncompressedSize = zipEntry.size;
const ratio = uncompressedSize / compressedSize;
if (ratio > 100) {
  throw new Error('Подозрительный коэффициент сжатия');
}

// 2. Лимит на общий размер распакованного содержимого
const MAX_UNCOMPRESSED = 500 * 1024 * 1024; // 500 MB
let totalUncompressed = 0;
for (const entry of entries) {
  totalUncompressed += entry.size;
  if (totalUncompressed > MAX_UNCOMPRESSED) {
    throw new Error('Архив слишком большой после распаковки');
  }
}

// 3. Лимит на количество файлов в архиве
if (entries.length > 1000) {
  throw new Error('Слишком много файлов в архиве');
}

// 4. Проверка путей внутри архива (path traversal)
for (const entry of entries) {
  if (entry.name.includes('..') || entry.name.startsWith('/')) {
    throw new Error('Недопустимый путь в архиве');
  }
}
```

### 3.11. Cleanup Strategy

```
┌─────────────────────────────────────────────────────────┐
│ Директория    │ Очистка              │ Частота          │
├───────────────┼──────────────────────┼──────────────────┤
│ storage/temp  │ Файлы старше 1 часа  │ Каждые 15 минут  │
│ storage/orig  │ По expires_at задачи  │ Каждый час       │
│ storage/proc  │ По expires_at задачи  │ Каждый час       │
│ storage/quar  │ Файлы старше 24 часов│ Раз в сутки      │
│ storage/fail  │ Файлы старше 7 дней  │ Раз в сутки      │
│ user_sessions │ expires_at < NOW()   │ Каждый час       │
│ audit_logs    │ Старше 1 года        │ Раз в сутки      │
│ file_jobs     │ deleted_at > 90 дней │ Раз в сутки      │
└───────────────┴──────────────────────┴──────────────────┘
```

Реализация: `CleanupService` с `@Cron()` декораторами (уже создан).

Дополнительный системный cron (на случай если NestJS не запущен):
```bash
# /etc/cron.d/file-workshop-cleanup
# Удаление файлов из temp старше 2 часов (safety net)
0 * * * * www-data find /var/www/file-workshop/storage/temp -type f -mmin +120 -delete
# Удаление файлов из quarantine старше 48 часов
0 3 * * * www-data find /var/www/file-workshop/storage/quarantine -type f -mmin +2880 -delete
```

### 3.12. File Retention Policy

| Тип пользователя | Срок хранения файлов | Срок хранения истории |
|-------------------|---------------------|----------------------|
| Анонимный | 24 часа | Нет истории |
| Free | 7 дней | 30 дней |
| Plus | 30 дней | 90 дней |
| Pro | 90 дней | 365 дней |

После истечения:
1. Файлы удаляются с диска (CleanupService)
2. Запись в file_jobs помечается deleted_at
3. Через 90 дней после deleted_at — физическое удаление записи

Пользователь может удалить файлы вручную в любой момент.

### 3.13. Access Control к файлам

```
ПРАВИЛО: Ни один файл не доступен напрямую через URL.
Все скачивания — через backend с проверкой прав.

GET /api/files/:jobId/download
  1. JWT проверка → user.id
  2. Загрузка job из БД
  3. job.userId === user.id? → иначе 403
  4. job.status === 'DONE'? → иначе 400
  5. Файл существует на диске? → иначе 404
  6. Stream файла через res.pipe()

Nginx: location /storage { deny all; }
```

### 3.14. Logging and Monitoring

#### Что логируем:

| Событие | Уровень | Где |
|---------|---------|-----|
| Успешный вход | INFO | audit_logs |
| Неудачный вход | WARN | audit_logs + server log |
| Регистрация | INFO | audit_logs |
| Upload файла | INFO | audit_logs |
| Download файла | INFO | audit_logs |
| Удаление истории | INFO | audit_logs |
| Path traversal attempt | ERROR | server log + audit_logs |
| MIME mismatch | WARN | server log |
| Rate limit hit | WARN | Nginx log |
| Job error | ERROR | server log |
| Worker crash | FATAL | server log + PM2 log |
| DB connection error | ERROR | server log |

#### Что НЕ логируем:
- Пароли (даже хэши)
- Полные JWT токены
- Содержимое файлов
- Полные stack traces в ответах клиенту (только на сервере)

#### Log rotation:
```bash
# /etc/logrotate.d/file-workshop
/var/www/file-workshop/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 3.15. Backup Strategy

```bash
#!/bin/bash
# /opt/scripts/backup-file-workshop.sh
# Запуск: cron каждый день в 2:00

BACKUP_DIR="/var/backups/file-workshop"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# 1. Бэкап БД
pg_dump -U postgres -Fc file_workshop > "$BACKUP_DIR/db_${DATE}.dump"

# 2. Бэкап .env (секреты)
cp /var/www/file-workshop/apps/api/.env "$BACKUP_DIR/env_${DATE}.bak"

# 3. Бэкап Nginx конфигурации
cp /etc/nginx/sites-available/file-workshop "$BACKUP_DIR/nginx_${DATE}.conf"

# 4. Удаление старых бэкапов
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete

# 5. Проверка размера
echo "Backup size: $(du -sh $BACKUP_DIR | cut -f1)"
```

```bash
# crontab
0 2 * * * /opt/scripts/backup-file-workshop.sh >> /var/log/backup.log 2>&1
```

Файлы пользователей НЕ бэкапятся (они временные и большие).
Бэкапится только БД (метаданные) и конфигурация.

### 3.16. Secrets Management

```
ПРАВИЛА:
1. Все секреты — ТОЛЬКО в .env файле на сервере
2. .env НИКОГДА не в git (проверить .gitignore)
3. Права доступа: chmod 600 .env, chown www-data:www-data
4. JWT секреты: минимум 64 символа, криптографически случайные
5. DATABASE_URL: пароль не 'password'
6. Генерация секретов:
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```bash
# Проверка .gitignore
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore
```

```bash
# Права на .env
chmod 600 /var/www/file-workshop/apps/api/.env
chown www-data:www-data /var/www/file-workshop/apps/api/.env
```

### 3.17. PostgreSQL Hardening

```bash
# /etc/postgresql/16/main/pg_hba.conf
# Только локальные подключения, только для нужного пользователя
local   file_workshop   file_workshop_user                  scram-sha-256
host    file_workshop   file_workshop_user  127.0.0.1/32    scram-sha-256

# Запретить подключения извне
# host  all             all                 0.0.0.0/0       reject
```

```sql
-- Создание пользователя с минимальными правами
CREATE USER file_workshop_user WITH PASSWORD 'strong-random-password';
CREATE DATABASE file_workshop OWNER file_workshop_user;

-- Только нужные права
GRANT CONNECT ON DATABASE file_workshop TO file_workshop_user;
GRANT USAGE ON SCHEMA public TO file_workshop_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO file_workshop_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO file_workshop_user;

-- Запретить создание таблиц (миграции запускать от другого пользователя)
-- REVOKE CREATE ON SCHEMA public FROM file_workshop_user;
```

### 3.18. Ubuntu Server Hardening

```bash
# 1. Обновления
sudo apt update && sudo apt upgrade -y
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades

# 2. Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# 3. SSH hardening
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no  # Только ключи
MaxAuthTries 3
AllowUsers deploy

# 4. Fail2ban
sudo apt install fail2ban
# /etc/fail2ban/jail.local
[sshd]
enabled = true
maxretry = 3
bantime = 3600

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 600

# 5. Права на storage
sudo chown -R www-data:www-data /var/www/file-workshop/storage
sudo chmod -R 750 /var/www/file-workshop/storage
# Запретить execution в storage
sudo chmod -R -x+X /var/www/file-workshop/storage

# 6. Отключить ненужные сервисы
sudo systemctl disable cups
sudo systemctl disable avahi-daemon
```

### 3.19. Command Injection Prevention

Worker вызывает системные команды (ghostscript, libreoffice, pandoc, pdftoppm, ImageMagick).

```typescript
// ПРАВИЛО: НИКОГДА не использовать shell: true
// ПРАВИЛО: НИКОГДА не конкатенировать пользовательский ввод в команду

// ПЛОХО:
exec(`convert ${userFilename} output.png`);  // Command injection!

// ХОРОШО:
execFile('convert', [safeFilePath, outputPath]);  // Аргументы как массив

// Все пути — UUID-based, не содержат пользовательского ввода
// execFile не использует shell — спецсимволы не интерпретируются
```

Уже реализовано: все вызовы через `execFile` (не `exec`), все пути — UUID.

### 3.20. XSS Prevention

```
1. React автоматически экранирует вывод в JSX
2. Имена файлов отображаются через {filename} (не dangerouslySetInnerHTML)
3. Content-Type при скачивании: application/octet-stream (не text/html)
4. X-Content-Type-Options: nosniff (браузер не угадывает тип)
5. CSP header в Nginx (ограничивает источники скриптов)
6. Имена файлов в Content-Disposition: encodeURIComponent()
```

## 4. Дополнительные конфигурации

### 4.1. .env.example (production-ready)

```env
# App
NODE_ENV=production
APP_PORT=4000
FRONTEND_URL=https://example.com

# Database (сильный пароль!)
DATABASE_URL=postgresql://file_workshop_user:STRONG_RANDOM_PASSWORD@127.0.0.1:5432/file_workshop?schema=public

# JWT (генерировать: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_ACCESS_SECRET=<64+ hex chars>
JWT_REFRESH_SECRET=<64+ hex chars, ДРУГОЙ чем access>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
STORAGE_BASE_DIR=/var/www/file-workshop/storage
MAX_FILE_SIZE_MB=50
```

### 4.2. PM2 security

```javascript
// ecosystem.config.js — дополнения
{
  name: 'api',
  // Запуск от непривилегированного пользователя
  uid: 'www-data',
  gid: 'www-data',
  // Не показывать env в pm2 info
  filter_env: ['DATABASE_URL', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'],
}
```

## 5. Чек-лист перед production запуском

### Критические (блокируют запуск):

- [ ] JWT секреты сгенерированы криптографически (64+ символов)
- [ ] JWT_ACCESS_SECRET ≠ JWT_REFRESH_SECRET
- [ ] DATABASE_URL содержит сильный пароль (не 'password')
- [ ] .env файл НЕ в git (проверить `git status`)
- [ ] .env файл: chmod 600, chown www-data
- [ ] HTTPS настроен (Let's Encrypt)
- [ ] Nginx: `location /storage { deny all; }`
- [ ] CORS origin = только production домен
- [ ] NODE_ENV=production
- [ ] PostgreSQL: только локальные подключения
- [ ] PostgreSQL: пользователь с минимальными правами
- [ ] Firewall (ufw): только 22, 80, 443
- [ ] SSH: PasswordAuthentication no, PermitRootLogin no

### Высокий приоритет:

- [ ] Rate limiting настроен в Nginx И NestJS
- [ ] Helmet middleware включён
- [ ] ValidationPipe: whitelist + forbidNonWhitelisted
- [ ] Cookie: httpOnly, secure, sameSite=strict
- [ ] Файлы: UUID-имена, path traversal защита
- [ ] MIME validation: расширение + Content-Type + magic bytes
- [ ] Файлы отдаются только через backend (не напрямую)
- [ ] Argon2id для паролей (не bcrypt, не SHA)
- [ ] Refresh token хранится как SHA-256 hash в БД
- [ ] Timing attack protection (фиктивный hash при несуществующем email)
- [ ] Ошибки auth: единое сообщение (не раскрываем что неверно)
- [ ] Audit log для login/logout/register/upload/delete
- [ ] Cleanup cron работает (temp, expired files, sessions)
- [ ] Backup cron работает (БД + .env)
- [ ] Log rotation настроен
- [ ] Fail2ban установлен и настроен

### Средний приоритет:

- [ ] PM2 запущен от www-data (не root)
- [ ] Storage директории: chmod 750
- [ ] Нет execution permission в storage
- [ ] Unattended-upgrades включён
- [ ] server_tokens off в Nginx
- [ ] CSP header настроен
- [ ] X-Frame-Options: SAMEORIGIN
- [ ] X-Content-Type-Options: nosniff
- [ ] HSTS header
- [ ] Все execFile вызовы без shell: true
- [ ] Все пользовательские данные валидируются через DTO/Zod
- [ ] Error responses не содержат stack traces
- [ ] Логи не содержат паролей и токенов
- [ ] npm audit / yarn audit — нет critical vulnerabilities

### Перед каждым деплоем:

- [ ] `npm audit` — проверка зависимостей
- [ ] Бэкап БД перед миграцией
- [ ] Тест: регистрация → вход → upload → download → logout
- [ ] Тест: rate limit работает (5+ попыток login)
- [ ] Тест: чужой файл недоступен (403)
- [ ] Тест: прямой доступ к /storage → 404
- [ ] Проверить логи на ошибки после деплоя
