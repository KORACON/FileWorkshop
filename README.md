# Универсальная мастерская файлов

Веб-приложение для конвертации и обработки файлов. Изображения, PDF, документы — всё в одном месте.

## Быстрый старт

### Требования
- Node.js 20+
- PostgreSQL 16+
- sharp, ImageMagick, Ghostscript, Poppler, LibreOffice, Pandoc (для конвертаций)

### Установка

```bash
# 1. Клонировать
git clone <repo-url>
cd file-workshop

# 2. Установить зависимости
cd apps/api && npm install
cd ../worker && npm install
cd ../web && npm install
cd ../..

# 3. Создать БД
psql -U postgres -c "CREATE DATABASE file_workshop;"

# 4. Настроить .env
cp apps/api/.env.example apps/api/.env
# Отредактировать DATABASE_URL и JWT секреты

# 5. Миграции и seed
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..

# 6. Собрать
cd apps/api && npm run build && cd ..
cd worker && npx tsc && cd ..
cd web && npx next build && cd ../..

# 7. Запустить
cd apps/api && node dist/main.js &     # API :4000
cd apps/worker && node dist/worker.js & # Worker
cd apps/web && npx next start &         # Frontend :3000
```

### Проверка
```bash
curl http://localhost:4000/api/health
# {"success":true,"data":{"status":"healthy",...}}
```

## Документация

Полная документация в `docs/`:
- `00-technical-specification.md` — финальная спецификация
- `01-architecture.md` — архитектура
- `02-database-schema.md` — схема БД
- `13-security-hardening.md` — безопасность
- `15-deployment.md` — деплой на VPS
