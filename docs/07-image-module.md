# Image Conversion Module — документация

## 1. Зависимости

### Node.js пакеты:
```json
{
  "sharp": "^0.33.0"
}
```

sharp использует libvips — самую быструю библиотеку для обработки изображений.
Устанавливается автоматически с предкомпилированными бинарниками.

### Системные пакеты (для HEIC и fallback):
```bash
# Ubuntu/Debian
sudo apt install imagemagick libheif-examples

# Проверка
magick --version    # ImageMagick v7
convert --version   # ImageMagick v6 (fallback)
```

### Когда что использовать:

| Формат | sharp | ImageMagick | Примечание |
|--------|-------|-------------|------------|
| JPG ↔ PNG | ✅ основной | fallback | sharp в 3-5x быстрее |
| WEBP ↔ JPG/PNG | ✅ основной | fallback | |
| AVIF ↔ JPG/PNG | ✅ основной | fallback | sharp с libvips ≥ 8.12 |
| BMP → PNG | ✅ основной | fallback | |
| TIFF → JPG | ✅ основной | fallback | |
| HEIC → JPG/PNG | ⚠️ пробуем | ✅ основной | sharp может не иметь libheif |
| Resize | ✅ | — | Lanczos3 по умолчанию |
| Compress | ✅ | — | mozjpeg для JPEG |
| Rotate | ✅ | — | |
| EXIF strip | ✅ | — | |
| ICO, TGA, PSD | — | ✅ | Будущее расширение |

## 2. Структура модуля

```
apps/worker/src/handlers/
└── image.handler.ts          # Единый файл, ~400 строк
    ├── handleImageConvert()  # Entry point (маршрутизация по operationType)
    ├── processConvert()      # Конвертация формата
    ├── processResize()       # Изменение размера
    ├── processCompress()     # Сжатие
    ├── processRotate()       # Поворот
    ├── processRemoveExif()   # Удаление метаданных
    ├── processCrop()         # Обрезка
    ├── convertWithSharp()    # Sharp pipeline
    ├── convertWithFallback() # Sharp → ImageMagick fallback
    ├── convertWithImageMagick() # ImageMagick CLI
    ├── applyOutputFormat()   # Настройка кодека вывода
    ├── applyOptions()        # Комбинированные операции
    └── утилиты               # normalizeExt, makeDownloadName, parseColor
```

## 3. Матрица конвертаций

| Из \ В | JPG | PNG | WEBP | AVIF | TIFF | BMP |
|--------|-----|-----|------|------|------|-----|
| JPG | — | ✅ | ✅ | ✅ | ✅ | ✅ |
| PNG | ✅ | — | ✅ | ✅ | ✅ | ✅ |
| WEBP | ✅ | ✅ | — | ✅ | ✅ | ✅ |
| AVIF | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| BMP | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| TIFF | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| HEIC | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

Все конвертации из MVP-списка покрыты.

## 4. Примеры options для каждой операции

### image.convert — конвертация формата
```json
{
  "operationType": "image.convert",
  "targetFormat": "png",
  "options": {
    "quality": "90"
  }
}
```

### image.convert — конвертация + resize одновременно
```json
{
  "operationType": "image.convert",
  "targetFormat": "webp",
  "options": {
    "quality": "80",
    "width": "800",
    "height": "600",
    "fit": "inside"
  }
}
```

### image.resize — изменение размера
```json
{
  "operationType": "image.resize",
  "options": {
    "width": "1200",
    "height": "800",
    "fit": "inside",
    "withoutEnlargement": "true",
    "background": "#ffffff"
  }
}
```

Параметр `fit`:
- `inside` — вписать в размеры, сохранить пропорции (по умолчанию)
- `cover` — заполнить размеры, обрезать лишнее
- `contain` — вписать + добавить фон (background)
- `fill` — растянуть без сохранения пропорций
- `outside` — минимальный размер, покрывающий указанные размеры

### image.compress — сжатие
```json
{
  "operationType": "image.compress",
  "options": {
    "quality": "70"
  }
}
```

Для PNG дополнительно:
```json
{
  "options": {
    "compressionLevel": "9",
    "palette": "true"
  }
}
```

### image.rotate — поворот
```json
{
  "operationType": "image.rotate",
  "options": {
    "rotation": "90"
  }
}
```
Допустимые значения: 90, 180, 270.

### image.remove_exif — удаление метаданных
```json
{
  "operationType": "image.remove_exif",
  "options": {}
}
```
Удаляет: EXIF, IPTC, XMP, ICC профиль. Автоматически поворачивает по EXIF перед удалением.

### image.crop — обрезка
```json
{
  "operationType": "image.crop",
  "options": {
    "left": "100",
    "top": "50",
    "width": "800",
    "height": "600"
  }
}
```

## 5. Интеграция с jobs

### Поток данных:

```
Frontend                    Backend                     Worker
   │                          │                           │
   │ POST /files/upload       │                           │
   │ file + operationType     │                           │
   │ + targetFormat + options  │                           │
   │─────────────────────────▶│                           │
   │                          │ 1. Валидация файла        │
   │                          │ 2. Сохранение в original/ │
   │                          │ 3. INSERT file_jobs       │
   │                          │    status: QUEUED         │
   │                          │    operation: image.convert│
   │                          │    source: jpg             │
   │                          │    target: png             │
   │                          │ 4. INSERT job_options      │
   │                          │    quality=90              │
   │  { jobId, status }       │                           │
   │◀─────────────────────────│                           │
   │                          │                           │
   │                          │           acquireNext()   │
   │                          │◀──────────────────────────│
   │                          │                           │
   │                          │           handleImage()   │
   │                          │           sharp pipeline  │
   │                          │           → processed/    │
   │                          │                           │
   │                          │           UPDATE file_jobs│
   │                          │           status: DONE    │
   │                          │           output_path     │
   │                          │           size_after      │
   │                          │──────────────────────────▶│
   │                          │                           │
   │ GET /jobs/:id/status     │                           │
   │─────────────────────────▶│                           │
   │ { status: DONE,          │                           │
   │   sizeBefore, sizeAfter }│                           │
   │◀─────────────────────────│                           │
   │                          │                           │
   │ GET /files/:id/download  │                           │
   │─────────────────────────▶│ stream from processed/    │
   │◀─────────────────────────│                           │
```

### Как options попадают в handler:

1. Frontend отправляет `options` как JSON-строку в multipart form
2. Backend парсит через `@Transform` в UploadFileDto
3. Backend сохраняет в таблицу `job_options` (key-value)
4. Worker загружает options через `prisma.jobOption.findMany`
5. Worker собирает в `Record<string, string>` и передаёт в handler

## 6. Обработка ошибок

| Ошибка | Действие | Retry |
|--------|----------|-------|
| Файл не найден на диске | ERROR | Нет |
| Неподдерживаемый формат (sharp) | Fallback на ImageMagick | Да |
| ImageMagick не установлен | ERROR | Нет |
| Повреждённый файл | ERROR | Нет |
| Таймаут (>2 мин) | Retry → ERROR | Да (до 3 раз) |
| Нехватка памяти | Retry → ERROR | Да |
| Невалидные options (width < 0) | ERROR | Нет |

## 7. Batch операции

Batch реализуется на уровне frontend + backend, а не в handler-е:

1. Frontend загружает N файлов через `POST /files/upload-multiple`
2. Backend создаёт N отдельных `file_jobs` с одинаковым `operationType` и `options`
3. Worker обрабатывает каждую задачу независимо
4. Frontend отслеживает статус каждой задачи через polling

Преимущества:
- Каждая задача имеет свой retry/error
- Worker обрабатывает параллельно (concurrency)
- Одна ошибка не блокирует остальные
- История сохраняется для каждого файла отдельно

## 8. Sharp vs ImageMagick — когда что

### Используй sharp (по умолчанию):
- Все стандартные форматы (JPG, PNG, WEBP, AVIF, TIFF, BMP, GIF)
- Resize, compress, rotate, crop
- Удаление EXIF
- Когда важна скорость (sharp в 3-10x быстрее)
- Когда важно потребление RAM (sharp использует streaming)

### Используй ImageMagick (fallback):
- HEIC/HEIF если sharp не собран с libheif
- Экзотические форматы (ICO, TGA, PSD, SVG rasterization)
- Когда sharp падает с ошибкой на конкретном файле
- Для будущих операций: водяной знак, сложные трансформации

### Архитектура fallback:
```
sharp(input) → success → результат
     ↓ ошибка
ImageMagick(input) → success → результат
     ↓ ошибка
ERROR → retry или финальная ошибка
```

Fallback автоматический — пользователь не видит разницы.
