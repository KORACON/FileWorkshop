# Upload и Storage модули — документация

## 1. Структура файлов

```
apps/api/src/modules/
├── storage/
│   ├── storage.module.ts          # Модуль, экспортирует StorageService
│   ├── storage.service.ts         # Работа с ФС: save, move, delete, stream, cleanup
│   └── storage.constants.ts       # Константы директорий
│
└── files/
    ├── files.module.ts            # Модуль с Multer конфигурацией
    ├── files.controller.ts        # 4 endpoints: upload, upload-multiple, download, download-original
    ├── files.service.ts           # Бизнес-логика: валидация, создание job, отдача файлов
    ├── pipes/
    │   └── file-validation.pipe.ts  # Быстрая предварительная валидация
    ├── utils/
    │   ├── mime-validator.ts        # Проверка реального MIME через magic bytes
    │   └── filename-sanitizer.ts    # Безопасные имена, маппинг форматов
    └── dto/
        ├── upload-file.dto.ts       # Валидация параметров загрузки
        └── file-response.dto.ts     # Формат ответов
```

## 2. API Endpoints

| Метод | URL | Rate Limit | Описание |
|-------|-----|------------|----------|
| POST | /api/files/upload | 10/мин | Загрузка одного файла |
| POST | /api/files/upload-multiple | 5/мин | Загрузка до 20 файлов |
| GET | /api/files/:jobId/download | 30/мин | Скачивание результата |
| GET | /api/files/:jobId/download-original | 30/мин | Скачивание оригинала |

Все endpoints требуют JWT авторизации.

## 3. Структура хранилища на диске

```
/storage/
├── temp/           ← Multer сохраняет сюда при загрузке
│   └── a1b2c3d4-...-uuid.jpg
│
├── original/       ← Оригиналы после валидации (перемещены из temp)
│   └── a1b2c3d4-...-uuid.jpg
│
├── processed/      ← Результаты обработки (worker записывает сюда)
│   └── e5f6g7h8-...-uuid.png
│
├── quarantine/     ← Подозрительные файлы (не прошли magic bytes проверку)
│   └── suspicious-uuid.exe
│
└── failed/         ← Файлы задач с ошибкой (для диагностики)
    └── failed-uuid.jpg
```

### Жизненный цикл файла:

```
Upload → temp/ → [валидация] → original/ → [worker обработка] → processed/
                      ↓                           ↓
                 quarantine/                   failed/
                 (подозрительный)              (ошибка обработки)
```

### Политика очистки:

| Директория | Очистка | Частота |
|-----------|---------|---------|
| temp/ | Файлы старше 1 часа | Каждые 15 минут |
| original/ | По expires_at задачи | Каждый час |
| processed/ | По expires_at задачи | Каждый час |
| quarantine/ | Файлы старше 24 часов | Раз в сутки |
| failed/ | Файлы старше 7 дней | Раз в сутки |

## 4. Безопасность

### Генерация имён файлов

Оригинальное имя файла НИКОГДА не используется в путях файловой системы.

```
Пользователь загружает: ../../../etc/passwd.jpg
Multer сохраняет как:   a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg
```

Процесс:
1. Multer → `diskStorage.filename()` → UUID + санитизированное расширение
2. Расширение: только `[a-z0-9.]`, максимум 10 символов
3. `basename()` перед любой операцией с путём — убирает `../`
4. `resolve()` + проверка `startsWith(baseDir)` — path traversal protection

### Проверка MIME type (3 уровня)

| Уровень | Что проверяется | Где |
|---------|----------------|-----|
| 1. Расширение | Whitelist допустимых расширений | FileValidationPipe |
| 2. Content-Type | Whitelist MIME из HTTP header | FilesService.validateFile |
| 3. Magic bytes | Реальное содержимое файла (первые 64 байта) | mime-validator.ts |

Если magic bytes не совпадают с заявленным MIME:
- Файл перемещается в quarantine/
- Пользователь получает ошибку 400
- Событие логируется

### Path traversal защита

```typescript
getFullPath(directory, filename) {
  const safeName = basename(filename);        // Убирает ../
  const fullPath = resolve(dirPath, safeName); // Абсолютный путь
  if (!fullPath.startsWith(resolve(dirPath))) { // Проверка
    throw new Error('Path traversal attempt');
  }
  return fullPath;
}
```

### Приватный доступ к файлам

- Nginx НЕ отдаёт файлы из storage/ напрямую
- Все скачивания идут через backend: GET /api/files/:jobId/download
- Backend проверяет: JWT → userId === job.userId → status === DONE → файл существует
- Файл отдаётся потоком (stream.pipe) с правильными заголовками
- `X-Content-Type-Options: nosniff` — браузер не будет угадывать тип

## 5. Формат запроса загрузки

```bash
# Один файл
curl -X POST http://localhost:4000/api/files/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@photo.jpg" \
  -F "operationType=image.convert" \
  -F "targetFormat=png" \
  -F 'options={"quality":"90"}'

# Несколько файлов
curl -X POST http://localhost:4000/api/files/upload-multiple \
  -H "Authorization: Bearer <token>" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "files=@photo3.jpg" \
  -F "operationType=image.convert" \
  -F "targetFormat=png"
```

## 6. Формат ответов

### Успешная загрузка одного файла:
```json
{
  "success": true,
  "data": {
    "jobId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "status": "QUEUED",
    "originalFilename": "photo.jpg",
    "fileSize": 2457600,
    "operationType": "image.convert"
  }
}
```

### Пакетная загрузка:
```json
{
  "success": true,
  "data": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "results": [
      { "jobId": "uuid-1", "status": "QUEUED", "originalFilename": "photo1.jpg", "fileSize": 1024000 },
      { "jobId": "uuid-2", "status": "QUEUED", "originalFilename": "photo2.jpg", "fileSize": 2048000 },
      { "jobId": "", "status": "ERROR", "originalFilename": "virus.exe", "fileSize": 512, "error": "Расширение .exe не поддерживается" }
    ]
  }
}
```

## 7. Исключения и логи

| Ситуация | HTTP код | Сообщение | Лог |
|----------|----------|-----------|-----|
| Файл не загружен | 400 | Файл не загружен | — |
| Пустой файл | 400 | Файл пустой | — |
| Превышен размер | 413 | Файл слишком большой (X MB). Максимум: Y MB | — |
| Недопустимое расширение | 400 | Расширение .exe не поддерживается | — |
| Недопустимый MIME | 400 | Тип файла application/x-msdownload не поддерживается | — |
| Magic bytes mismatch | 400 | Содержимое файла не соответствует заявленному типу | WARN + файл → quarantine |
| Null bytes в имени | 400 | Недопустимое имя файла | — |
| Path traversal | 500 | Недопустимый путь к файлу | ERROR |
| Задача не найдена | 404 | Задача не найдена | — |
| Чужая задача | 403 | Нет доступа к этому файлу | — |
| Задача не готова | 400 | Файл ещё обрабатывается | — |
| Файл удалён с диска | 404 | Файл результата удалён или недоступен | ERROR |
| Успешная загрузка | — | — | LOG: Upload: photo.jpg (2.3 MB) → job uuid [image.convert] |
| Пакетная загрузка | — | — | LOG: audit upload_batch |
