#!/bin/bash
# Production deploy script
# Использование: ./deploy.sh
# Запускать от пользователя deploy на сервере
set -euo pipefail

APP_DIR="/var/www/file-workshop"
SRC_DIR="/tmp/file-workshop-src"
BACKUP_DIR="/var/backups/file-workshop"
DATE=$(date +%Y%m%d_%H%M%S)

echo "═══════════════════════════════════════"
echo "  Deploy started: $(date)"
echo "═══════════════════════════════════════"

# 1. Бэкап БД
echo "[1/8] Backup database..."
mkdir -p "$BACKUP_DIR"
pg_dump -U file_workshop_user -h 127.0.0.1 -Fc file_workshop > "$BACKUP_DIR/pre_deploy_${DATE}.dump"

# 2. Pull
echo "[2/8] Pulling latest code..."
cd "$SRC_DIR"
git pull origin main

# 3. Backend
echo "[3/8] Building API..."
cd "$APP_DIR/apps/api"
rsync -a --delete "$SRC_DIR/apps/api/src/" src/
cp "$SRC_DIR/apps/api/package.json" "$SRC_DIR/apps/api/tsconfig"*.json .
rsync -a "$SRC_DIR/apps/api/prisma/" prisma/
npm ci --production=false
npx prisma generate
npx prisma migrate deploy
npm run build
npm prune --production

# 4. Worker
echo "[4/8] Building Worker..."
cd "$APP_DIR/apps/worker"
rsync -a --delete "$SRC_DIR/apps/worker/src/" src/
cp "$SRC_DIR/apps/worker/package.json" "$SRC_DIR/apps/worker/tsconfig.json" .
npm ci --production=false
npm run build
npm prune --production

# 5. Frontend
echo "[5/8] Building Frontend..."
cd "$APP_DIR/apps/web"
for dir in app components hooks lib stores types styles public; do
  [ -d "$SRC_DIR/apps/web/$dir" ] && rsync -a --delete "$SRC_DIR/apps/web/$dir/" "$dir/"
done
cp "$SRC_DIR/apps/web/package.json" "$SRC_DIR/apps/web/"*.config.ts "$SRC_DIR/apps/web/tsconfig.json" .
npm ci
npm run build

# 6. PM2 config
echo "[6/8] Updating PM2 config..."
cp "$SRC_DIR/ecosystem.config.js" "$APP_DIR/"

# 7. Restart
echo "[7/8] Restarting services..."
cd "$APP_DIR"
pm2 restart ecosystem.config.js
pm2 save

# 8. Health check
echo "[8/8] Health check..."
sleep 5
for svc in "127.0.0.1:4000/api/health" "127.0.0.1:3000"; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://$svc" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ]; then
    echo "  ✅ $svc → $CODE"
  else
    echo "  ❌ $svc → $CODE"
  fi
done

echo "═══════════════════════════════════════"
echo "  Deploy completed: $(date)"
echo "═══════════════════════════════════════"
