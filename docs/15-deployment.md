# Production Deployment — пошаговая инструкция

Один VPS, Ubuntu 24.04 LTS, без Docker.

## 1. Структура каталогов на сервере

```
/var/www/file-workshop/
├── apps/
│   ├── api/                    # NestJS backend (собранный)
│   │   ├── dist/
│   │   ├── node_modules/
│   │   ├── prisma/
│   │   └── .env                # Секреты (chmod 600)
│   ├── web/                    # Next.js frontend (собранный)
│   │   ├── .next/
│   │   ├── node_modules/
│   │   └── public/
│   └── worker/                 # Worker (собранный)
│       ├── dist/
│       └── node_modules/
├── storage/                    # Файловое хранилище
│   ├── temp/
│   ├── original/
│   ├── processed/
│   ├── quarantine/
│   └── failed/
├── logs/                       # PM2 логи
├── backups/                    # Скрипты бэкапа
├── ecosystem.config.js         # PM2 конфигурация
└── deploy.sh                   # Скрипт деплоя
```

## 2. Начальная настройка сервера

```bash
# Подключаемся по SSH
ssh root@YOUR_SERVER_IP

# Создаём пользователя для деплоя
adduser deploy
usermod -aG sudo deploy

# SSH ключ для deploy
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys

# Отключаем root login и пароли
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Обновление системы
apt update && apt upgrade -y

# Автоматические обновления безопасности
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades
```

## 3. Установка зависимостей

### Node.js LTS (v22.x)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
apt install -y nodejs
node -v   # v22.x.x
npm -v    # 10.x.x
```

### PM2

```bash
npm install -g pm2
pm2 startup systemd -u deploy --hp /home/deploy
```

### PostgreSQL 16

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

### Системные пакеты для конвертации

```bash
# ImageMagick (конвертация изображений, fallback для HEIC)
apt install -y imagemagick

# Sharp зависимости (libvips)
apt install -y libvips-dev

# Ghostscript (сжатие PDF)
apt install -y ghostscript

# Poppler utils (PDF → изображения)
apt install -y poppler-utils

# LibreOffice headless (DOCX/ODT/RTF → PDF)
apt install -y libreoffice-core libreoffice-writer

# Pandoc (Markdown, HTML, TXT конвертации)
apt install -y pandoc

# Архивация
apt install -y zip unzip

# ExifTool (удаление метаданных, опционально)
apt install -y libimage-exiftool-perl

# Fail2ban
apt install -y fail2ban

# Nginx
apt install -y nginx

# Certbot (Let's Encrypt)
apt install -y certbot python3-certbot-nginx
```

### Проверка установки

```bash
node -v          # v22.x
npm -v           # 10.x
pm2 -v           # 5.x
psql --version   # 16.x
convert --version # ImageMagick 7.x или 6.x
gs --version     # Ghostscript 10.x
pdftoppm -v      # poppler 24.x
libreoffice --version  # LibreOffice 24.x
pandoc --version # Pandoc 3.x
nginx -v         # nginx 1.24+
```

## 4. Настройка PostgreSQL

```bash
# Переключаемся на пользователя postgres
sudo -u postgres psql

-- Создаём пользователя (СИЛЬНЫЙ пароль!)
CREATE USER file_workshop_user WITH PASSWORD 'GENERATE_STRONG_PASSWORD_HERE';

-- Создаём БД
CREATE DATABASE file_workshop OWNER file_workshop_user;

-- Права
GRANT ALL PRIVILEGES ON DATABASE file_workshop TO file_workshop_user;

\q
```

```bash
# Ограничиваем подключения: только локальные
sudo nano /etc/postgresql/16/main/pg_hba.conf

# Добавить/изменить:
local   file_workshop   file_workshop_user                  scram-sha-256
host    file_workshop   file_workshop_user  127.0.0.1/32    scram-sha-256

# Перезапуск
sudo systemctl restart postgresql

# Проверка подключения
psql -U file_workshop_user -d file_workshop -h 127.0.0.1
```

## 5. Создание каталогов и прав

```bash
# Создаём структуру
sudo mkdir -p /var/www/file-workshop/{apps/{api,web,worker},storage/{temp,original,processed,quarantine,failed},logs,backups}

# Владелец — deploy
sudo chown -R deploy:deploy /var/www/file-workshop

# Права на storage — нет execution
chmod -R 750 /var/www/file-workshop/storage
chmod -R -x+X /var/www/file-workshop/storage

# Права на логи
chmod 750 /var/www/file-workshop/logs
```

## 6. Настройка .env

```bash
# Переключаемся на deploy
su - deploy

# Создаём .env
nano /var/www/file-workshop/apps/api/.env
```

```env
# App
NODE_ENV=production
APP_PORT=4000
FRONTEND_URL=https://your-domain.com

# Database
DATABASE_URL=postgresql://file_workshop_user:YOUR_STRONG_PASSWORD@127.0.0.1:5432/file_workshop?schema=public

# JWT (генерируем уникальные!)
# node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_ACCESS_SECRET=PASTE_64_CHAR_HEX_HERE
JWT_REFRESH_SECRET=PASTE_DIFFERENT_64_CHAR_HEX_HERE
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Storage
STORAGE_BASE_DIR=/var/www/file-workshop/storage
MAX_FILE_SIZE_MB=50
```

```bash
# Защищаем .env
chmod 600 /var/www/file-workshop/apps/api/.env
```

## 7. Первый деплой — сборка и запуск

### Клонирование и установка

```bash
su - deploy
cd /var/www/file-workshop

# Клонируем репозиторий (или копируем через rsync/scp)
git clone git@github.com:your-org/file-workshop.git /tmp/file-workshop-src

# Копируем исходники
cp -r /tmp/file-workshop-src/apps/api/* /var/www/file-workshop/apps/api/
cp -r /tmp/file-workshop-src/apps/web/* /var/www/file-workshop/apps/web/
cp -r /tmp/file-workshop-src/apps/worker/* /var/www/file-workshop/apps/worker/
cp /tmp/file-workshop-src/ecosystem.config.js /var/www/file-workshop/
```

### Сборка Backend (NestJS)

```bash
cd /var/www/file-workshop/apps/api

# Установка зависимостей
npm ci --production=false

# Генерация Prisma Client
npx prisma generate

# Миграции
npx prisma migrate deploy

# Seed (опционально, только первый раз)
# npx prisma db seed

# Сборка TypeScript
npm run build

# Удаляем dev-зависимости
npm prune --production
```

### Сборка Frontend (Next.js)

```bash
cd /var/www/file-workshop/apps/web

# Установка
npm ci

# Сборка
NEXT_PUBLIC_API_URL=https://your-domain.com npm run build
```

### Сборка Worker

```bash
cd /var/www/file-workshop/apps/worker

# Установка
npm ci --production=false

# Сборка
npm run build

# Удаляем dev-зависимости
npm prune --production
```

### PM2 конфигурация

```bash
cd /var/www/file-workshop
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'api',
      cwd: '/var/www/file-workshop/apps/api',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: '/var/www/file-workshop/logs/api-error.log',
      out_file: '/var/www/file-workshop/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'worker',
      cwd: '/var/www/file-workshop/apps/worker',
      script: 'dist/worker.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      kill_timeout: 35000,
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: '2',
        WORKER_POLL_INTERVAL_MS: '3000',
        WORKER_JOB_TIMEOUT_MS: '120000',
      },
      error_file: '/var/www/file-workshop/logs/worker-error.log',
      out_file: '/var/www/file-workshop/logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
    {
      name: 'web',
      cwd: '/var/www/file-workshop/apps/web',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'https://your-domain.com',
      },
      error_file: '/var/www/file-workshop/logs/web-error.log',
      out_file: '/var/www/file-workshop/logs/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
```

### Запуск

```bash
cd /var/www/file-workshop
pm2 start ecosystem.config.js
pm2 save

# Проверка
pm2 status
pm2 logs --lines 20
```

## 8. Nginx Reverse Proxy

```bash
sudo nano /etc/nginx/sites-available/file-workshop
```

```nginx
# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=30r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=upload:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=download:10m rate=30r/m;
limit_conn_zone $binary_remote_addr zone=addr:10m;

server {
    listen 80;
    server_name your-domain.com;

    # Certbot добавит redirect на HTTPS автоматически
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL — будет заполнено Certbot
    # ssl_certificate ...
    # ssl_certificate_key ...

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Limits
    client_max_body_size 55m;
    limit_conn addr 20;
    server_tokens off;

    # Block storage and hidden files
    location /storage { deny all; return 404; }
    location ~ /\. { deny all; return 404; }

    # Auth — strict rate limit
    location /api/auth/ {
        limit_req zone=auth burst=3 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Upload
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

    # Download
    location ~ /api/files/.*/download {
        limit_req zone=download burst=10 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
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

```bash
# Активация
sudo ln -s /etc/nginx/sites-available/file-workshop /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 9. HTTPS (Let's Encrypt)

```bash
sudo certbot --nginx -d your-domain.com

# Автоматическое обновление (certbot добавляет cron автоматически)
# Проверка:
sudo certbot renew --dry-run
```

## 10. Log Rotation

```bash
sudo nano /etc/logrotate.d/file-workshop
```

```
/var/www/file-workshop/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 deploy deploy
    postrotate
        su - deploy -c "pm2 reloadLogs" > /dev/null 2>&1
    endscript
}
```

```bash
# Проверка
sudo logrotate -d /etc/logrotate.d/file-workshop
```

## 11. Backup Strategy

```bash
nano /var/www/file-workshop/backups/backup.sh
```

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/var/backups/file-workshop"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# БД
pg_dump -U file_workshop_user -h 127.0.0.1 -Fc file_workshop > "$BACKUP_DIR/db_${DATE}.dump"

# .env
cp /var/www/file-workshop/apps/api/.env "$BACKUP_DIR/env_${DATE}.bak"
chmod 600 "$BACKUP_DIR/env_${DATE}.bak"

# Nginx
cp /etc/nginx/sites-available/file-workshop "$BACKUP_DIR/nginx_${DATE}.conf"

# Очистка старых (30 дней)
find "$BACKUP_DIR" -type f -mtime +30 -delete

echo "[$(date)] Backup done: $(du -sh $BACKUP_DIR | cut -f1)"
```

```bash
chmod +x /var/www/file-workshop/backups/backup.sh

# Cron: каждый день в 2:00
crontab -e
# Добавить:
0 2 * * * /var/www/file-workshop/backups/backup.sh >> /var/www/file-workshop/logs/backup.log 2>&1
```

## 12. Cleanup Cron Jobs

```bash
crontab -e
```

```cron
# Cleanup temp файлов (safety net, каждый час)
0 * * * * find /var/www/file-workshop/storage/temp -type f -mmin +120 -delete 2>/dev/null

# Cleanup quarantine (каждый день в 3:00)
0 3 * * * find /var/www/file-workshop/storage/quarantine -type f -mmin +2880 -delete 2>/dev/null

# Cleanup failed (каждый день в 3:30)
30 3 * * * find /var/www/file-workshop/storage/failed -type f -mtime +7 -delete 2>/dev/null

# Бэкап БД (каждый день в 2:00)
0 2 * * * /var/www/file-workshop/backups/backup.sh >> /var/www/file-workshop/logs/backup.log 2>&1

# Мониторинг диска (каждые 6 часов)
0 */6 * * * df -h /var/www/file-workshop/storage | tail -1 >> /var/www/file-workshop/logs/disk-usage.log
```

Основная очистка (expired files, sessions, stale jobs) выполняется NestJS CleanupService через `@Cron()`. Системный cron — safety net.

## 13. Безопасные права доступа

```bash
# Владелец всего — deploy
sudo chown -R deploy:deploy /var/www/file-workshop

# .env — только владелец
chmod 600 /var/www/file-workshop/apps/api/.env

# Storage — нет execution
chmod -R 750 /var/www/file-workshop/storage
find /var/www/file-workshop/storage -type f -exec chmod 640 {} \;

# Логи
chmod 750 /var/www/file-workshop/logs

# Скрипты
chmod 750 /var/www/file-workshop/backups/backup.sh
chmod 750 /var/www/file-workshop/deploy.sh

# Бэкапы — только владелец
chmod 700 /var/backups/file-workshop
```

## 14. Скрипт обновления (deploy.sh)

```bash
nano /var/www/file-workshop/deploy.sh
chmod +x /var/www/file-workshop/deploy.sh
```

```bash
#!/bin/bash
# Деплой обновления на production
# Использование: ./deploy.sh
set -euo pipefail

APP_DIR="/var/www/file-workshop"
SRC_DIR="/tmp/file-workshop-src"
BACKUP_DIR="/var/backups/file-workshop"
DATE=$(date +%Y%m%d_%H%M%S)

echo "═══════════════════════════════════════"
echo "  Deploy started: $(date)"
echo "═══════════════════════════════════════"

# 1. Бэкап БД перед деплоем
echo "[1/8] Backup database..."
pg_dump -U file_workshop_user -h 127.0.0.1 -Fc file_workshop > "$BACKUP_DIR/pre_deploy_${DATE}.dump"

# 2. Получение нового кода
echo "[2/8] Pulling latest code..."
cd "$SRC_DIR"
git pull origin main

# 3. Сборка Backend
echo "[3/8] Building API..."
cp -r "$SRC_DIR/apps/api/src" "$APP_DIR/apps/api/src"
cp "$SRC_DIR/apps/api/package.json" "$APP_DIR/apps/api/"
cp "$SRC_DIR/apps/api/tsconfig*.json" "$APP_DIR/apps/api/"
cp -r "$SRC_DIR/apps/api/prisma" "$APP_DIR/apps/api/"

cd "$APP_DIR/apps/api"
npm ci --production=false
npx prisma generate
npx prisma migrate deploy
npm run build
npm prune --production

# 4. Сборка Worker
echo "[4/8] Building Worker..."
cp -r "$SRC_DIR/apps/worker/src" "$APP_DIR/apps/worker/src"
cp "$SRC_DIR/apps/worker/package.json" "$APP_DIR/apps/worker/"
cp "$SRC_DIR/apps/worker/tsconfig.json" "$APP_DIR/apps/worker/"

cd "$APP_DIR/apps/worker"
npm ci --production=false
npm run build
npm prune --production

# 5. Сборка Frontend
echo "[5/8] Building Frontend..."
cp -r "$SRC_DIR/apps/web/app" "$APP_DIR/apps/web/app"
cp -r "$SRC_DIR/apps/web/components" "$APP_DIR/apps/web/components"
cp -r "$SRC_DIR/apps/web/hooks" "$APP_DIR/apps/web/hooks"
cp -r "$SRC_DIR/apps/web/lib" "$APP_DIR/apps/web/lib"
cp -r "$SRC_DIR/apps/web/stores" "$APP_DIR/apps/web/stores"
cp -r "$SRC_DIR/apps/web/types" "$APP_DIR/apps/web/types"
cp -r "$SRC_DIR/apps/web/styles" "$APP_DIR/apps/web/styles"
cp "$SRC_DIR/apps/web/package.json" "$APP_DIR/apps/web/"
cp "$SRC_DIR/apps/web/next.config.ts" "$APP_DIR/apps/web/"
cp "$SRC_DIR/apps/web/tailwind.config.ts" "$APP_DIR/apps/web/"
cp "$SRC_DIR/apps/web/tsconfig.json" "$APP_DIR/apps/web/"

cd "$APP_DIR/apps/web"
npm ci
npm run build

# 6. Обновление PM2 конфигурации
echo "[6/8] Updating PM2 config..."
cp "$SRC_DIR/ecosystem.config.js" "$APP_DIR/"

# 7. Перезапуск процессов
echo "[7/8] Restarting services..."
cd "$APP_DIR"
pm2 restart ecosystem.config.js
pm2 save

# 8. Проверка
echo "[8/8] Health check..."
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ API healthy"
else
    echo "❌ API returned $HTTP_CODE — check logs!"
    pm2 logs api --lines 20
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000)
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Frontend healthy"
else
    echo "❌ Frontend returned $HTTP_CODE — check logs!"
    pm2 logs web --lines 20
fi

echo "═══════════════════════════════════════"
echo "  Deploy completed: $(date)"
echo "═══════════════════════════════════════"
```

## Полезные команды

```bash
# Статус процессов
pm2 status

# Логи в реальном времени
pm2 logs
pm2 logs api --lines 50
pm2 logs worker --lines 50

# Перезапуск одного процесса
pm2 restart api
pm2 restart worker
pm2 restart web

# Мониторинг CPU/RAM
pm2 monit

# Проверка здоровья API
curl http://127.0.0.1:4000/api/health

# Проверка Nginx
sudo nginx -t
sudo systemctl reload nginx

# Проверка PostgreSQL
psql -U file_workshop_user -h 127.0.0.1 -d file_workshop -c "SELECT count(*) FROM users;"

# Проверка диска
df -h /var/www/file-workshop/storage
du -sh /var/www/file-workshop/storage/*

# Проверка SSL
sudo certbot certificates

# Откат БД (из бэкапа)
pg_restore -U file_workshop_user -h 127.0.0.1 -d file_workshop --clean /var/backups/file-workshop/pre_deploy_YYYYMMDD.dump

# Просмотр cron задач
crontab -l

# Проверка fail2ban
sudo fail2ban-client status
sudo fail2ban-client status sshd
```
