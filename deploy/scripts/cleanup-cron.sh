#!/bin/bash
# Safety net: очистка файлов если NestJS CleanupService не работает
# Запуск: cron каждый час
# 0 * * * * /var/www/file-workshop/deploy/scripts/cleanup-cron.sh >> /var/log/file-workshop-cleanup.log 2>&1

set -euo pipefail

STORAGE="/var/www/file-workshop/storage"

echo "[$(date)] Cleanup started"

# temp: файлы старше 2 часов
TEMP_COUNT=$(find "$STORAGE/temp" -type f -mmin +120 -delete -print 2>/dev/null | wc -l)
[ "$TEMP_COUNT" -gt 0 ] && echo "  temp: удалено $TEMP_COUNT файлов"

# quarantine: файлы старше 48 часов
QUAR_COUNT=$(find "$STORAGE/quarantine" -type f -mmin +2880 -delete -print 2>/dev/null | wc -l)
[ "$QUAR_COUNT" -gt 0 ] && echo "  quarantine: удалено $QUAR_COUNT файлов"

# failed: файлы старше 7 дней
FAIL_COUNT=$(find "$STORAGE/failed" -type f -mtime +7 -delete -print 2>/dev/null | wc -l)
[ "$FAIL_COUNT" -gt 0 ] && echo "  failed: удалено $FAIL_COUNT файлов"

# Проверка свободного места
DISK_USAGE=$(df "$STORAGE" | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "  WARNING: Диск заполнен на ${DISK_USAGE}%!"
fi

echo "[$(date)] Cleanup done"
