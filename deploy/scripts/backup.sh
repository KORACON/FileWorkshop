#!/bin/bash
# Бэкап БД и конфигурации
# Запуск: cron каждый день в 2:00
# 0 2 * * * /var/www/file-workshop/deploy/scripts/backup.sh >> /var/log/file-workshop-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="/var/backups/file-workshop"
APP_DIR="/var/www/file-workshop"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date)] Начало бэкапа..."

# 1. Бэкап PostgreSQL
echo "  БД..."
pg_dump -U postgres -Fc file_workshop > "$BACKUP_DIR/db_${DATE}.dump"

# 2. Бэкап .env
echo "  Конфигурация..."
cp "$APP_DIR/apps/api/.env" "$BACKUP_DIR/env_${DATE}.bak"
chmod 600 "$BACKUP_DIR/env_${DATE}.bak"

# 3. Бэкап Nginx
cp /etc/nginx/sites-available/file-workshop "$BACKUP_DIR/nginx_${DATE}.conf" 2>/dev/null || true

# 4. Удаление старых бэкапов
echo "  Очистка старых бэкапов..."
find "$BACKUP_DIR" -type f -mtime +${RETENTION_DAYS} -delete

# 5. Итог
SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "[$(date)] Бэкап завершён. Размер: $SIZE"
