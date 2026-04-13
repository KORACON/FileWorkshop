# PDF Module — документация

## 1. Архитектура

```
apps/worker/src/handlers/pdf.handler.ts
├── handlePdfOperation()     # Entry point — маршрутизация
├── pdfMerge()               # pdf-lib: объединение PDF
├── pdfSplit()               # pdf-lib + archiver: разделение → ZIP
├── pdfExtractPages()        # pdf-lib: извлечение страниц
├── pdfRotate()              # pdf-lib: поворот страниц
├── pdfCompress()            # ghostscript: сжатие
├── pdfFromImages()          # pdf-lib + sharp: изображения → PDF
├── pdfToImages()            # poppler (pdftoppm) + archiver: PDF → PNG/JPG
├── pdfRemoveMetadata()      # pdf-lib: очистка метаданных
├── pdfReorder()             # pdf-lib: перестановка страниц
├── parsePageNumbers()       # Утилита: "1,3,5-7" → [0,2,4,5,6]
└── parsePageNumbersRaw()    # Утилита: "1,3,5-7" → [1,3,5,6,7]
```

## 2. Инструменты и библиотеки

### Node.js пакеты:
| Пакет | Версия | Назначение |
|-------|--------|------------|
| pdf-lib | ^1.17.0 | Merge, split, extract, rotate, reorder, metadata, embed images |
| sharp | ^0.33.0 | Подготовка изображений для embedding в PDF |
| archiver | ^7.0.0 | Создание ZIP для split и to_images |

### Системные пакеты:
```bash
# Ubuntu/Debian
sudo apt install ghostscript poppler-utils

# Проверка
gs --version          # Ghostscript
pdftoppm -v           # Poppler utils
pdfinfo --version     # Poppler utils (информация о PDF)
```

### Когда что используется:

| Операция | Инструмент | Почему |
|----------|-----------|--------|
| merge | pdf-lib | Чистый JS, быстрый, не нужен системный пакет |
| split | pdf-lib + archiver | Каждая страница → отдельный PDF → ZIP |
| extract_pages | pdf-lib | Копирование страниц между документами |
| rotate | pdf-lib | Изменение rotation angle страницы |
| compress | ghostscript | Единственный инструмент с реальным сжатием PDF |
| from_images | pdf-lib + sharp | sharp конвертирует в PNG, pdf-lib embed-ит |
| to_images | pdftoppm | Быстрая растеризация, лучше качество чем JS |
| remove_metadata | pdf-lib | Прямой доступ к полям метаданных |
| reorder | pdf-lib | Копирование страниц в новом порядке |

## 3. Примеры options для каждой операции

### pdf.merge
```json
{
  "operationType": "pdf.merge",
  "options": {
    "additionalFiles": "[\"/storage/original/uuid2.pdf\",\"/storage/original/uuid3.pdf\"]"
  }
}
```
Основной файл (job.storedOriginalPath) — первый. Дополнительные — в additionalFiles.

### pdf.split
```json
{ "operationType": "pdf.split", "options": {} }
```
Результат: ZIP с page_1.pdf, page_2.pdf, ...

### pdf.extract_pages
```json
{
  "operationType": "pdf.extract_pages",
  "options": { "pages": "1,3,5-7,10" }
}
```
Формат pages: номера через запятую, диапазоны через дефис. 1-indexed.

### pdf.rotate
```json
{
  "operationType": "pdf.rotate",
  "options": {
    "rotation": "90",
    "pages": "1,3"
  }
}
```
rotation: 90, 180, 270. pages: какие страницы (по умолчанию все).

### pdf.compress
```json
{
  "operationType": "pdf.compress",
  "options": { "quality": "ebook" }
}
```
quality: screen (72dpi), ebook (150dpi), printer (300dpi), prepress (300dpi+).

### pdf.from_images
```json
{
  "operationType": "pdf.from_images",
  "options": {
    "additionalFiles": "[\"/storage/original/img2.jpg\",\"/storage/original/img3.png\"]"
  }
}
```

### pdf.to_images
```json
{
  "operationType": "pdf.to_images",
  "options": {
    "format": "png",
    "dpi": "300",
    "pages": "1-5"
  }
}
```
format: png или jpg. dpi: 72-600. Одна страница → файл, несколько → ZIP.

### pdf.remove_metadata
```json
{ "operationType": "pdf.remove_metadata", "options": {} }
```

### pdf.reorder
```json
{
  "operationType": "pdf.reorder",
  "options": { "order": "3,1,2,5,4" }
}
```
Нужно указать ВСЕ страницы в новом порядке. Количество должно совпадать.

## 4. Ограничения и edge cases

| Ситуация | Поведение |
|----------|-----------|
| Зашифрованный PDF | pdf-lib: `ignoreEncryption: true` — пробуем открыть. Если не получится — ERROR |
| PDF без страниц | ERROR: "PDF не содержит страниц" |
| Более 500 страниц (split) | ERROR: лимит для защиты от исчерпания диска |
| Более 50 файлов (merge) | ERROR: лимит для защиты от RAM |
| Более 100 изображений (from_images) | ERROR: лимит |
| Невалидные номера страниц | Игнорируются (extract), ERROR (reorder) |
| Повреждённый PDF | pdf-lib бросит ошибку → retry → ERROR |
| Ghostscript не установлен | ERROR с инструкцией по установке |
| pdftoppm не установлен | ERROR с инструкцией по установке |
| Очень большой PDF (>100MB) | Таймаут 3 мин для compress, 2 мин для остальных |
| DPI > 600 (to_images) | ERROR: лимит для защиты от RAM |

## 5. Обработка ошибок

Все ошибки пробрасываются в worker-loop, который решает: retry или ERROR.

| Тип ошибки | Retry | Пояснение |
|-----------|-------|-----------|
| Файл не найден | Нет | Файл удалён — retry бесполезен |
| Повреждённый PDF | Нет | Файл не изменится |
| Системный пакет не установлен | Нет | Нужно вмешательство админа |
| Таймаут | Да | Сервер мог быть нагружен |
| Нехватка памяти | Да | Другие задачи могли освободить RAM |
| Ошибка записи на диск | Да | Временная проблема |

Временные файлы (tempDir для split/to_images) очищаются в `finally` блоке.

## 6. Рекомендации по качеству и производительности

### Сжатие (compress):
- `screen` — для отправки по email, просмотра на экране. Сильная потеря качества изображений
- `ebook` — оптимальный баланс для большинства случаев (по умолчанию)
- `printer` — для печати. Минимальная потеря качества
- `prepress` — для типографии. Практически без потерь

### to_images:
- 150 dpi — для просмотра на экране (по умолчанию)
- 300 dpi — для печати
- 72 dpi — для превью/миниатюр
- Больше 300 dpi редко нужно и сильно увеличивает размер

### from_images:
- sharp конвертирует все изображения в PNG перед embedding
- Размер страницы = размер изображения (не A4)
- Максимальный размер страницы ограничен 4000 points

### Общее:
- pdf-lib работает в памяти — для PDF >50MB может потребоваться много RAM
- ghostscript работает потоково — справляется с большими файлами лучше
- pdftoppm — самый быстрый растеризатор PDF (быстрее чем mupdf, pdf.js)
- Для merge/split/extract — pdf-lib оптимален (чистый JS, быстрый)
