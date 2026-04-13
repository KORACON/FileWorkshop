# Document Conversion Module — документация

## 1. Архитектура

```
apps/worker/src/handlers/document.handler.ts
├── CONVERSION_TABLE              # Таблица маршрутизации source:target → tool
├── handleDocConvert()            # Entry point
├── convertWithLibreOffice()      # LibreOffice headless
├── convertWithPandoc()           # Pandoc CLI
├── convertMarkdownToPdf()        # MD→PDF (LaTeX или HTML→PDF fallback)
├── assertCommandExists()         # Проверка системных зависимостей
├── commandExists()               # which/where
├── getSupportedConversions()     # Список для UI
└── isConversionSupported()       # Валидация пары форматов
```

Принцип расширения: для добавления новой конвертации достаточно добавить строку в `CONVERSION_TABLE`. Код обработки менять не нужно.

## 2. Системные зависимости

```bash
# Ubuntu/Debian — обязательные
sudo apt install libreoffice-core libreoffice-writer pandoc

# Проверка
libreoffice --version    # LibreOffice 24.x
pandoc --version         # Pandoc 3.x

# Опционально — для Markdown → PDF через LaTeX (лучшее качество)
sudo apt install texlive-xetex texlive-fonts-recommended texlive-lang-cyrillic
# Внимание: texlive-full ~4GB. Для MVP можно обойтись без него.
```

### Что делает каждый пакет:

| Пакет | Размер | Назначение |
|-------|--------|------------|
| libreoffice-core | ~200MB | Ядро LibreOffice |
| libreoffice-writer | ~50MB | Модуль Writer (DOCX, ODT, RTF) |
| pandoc | ~30MB | Конвертер текстовых форматов |
| texlive-xetex | ~300MB | LaTeX engine для Pandoc→PDF (опционально) |
| texlive-fonts-recommended | ~100MB | Шрифты для LaTeX (опционально) |
| texlive-lang-cyrillic | ~50MB | Кириллица в LaTeX (опционально) |

## 3. Матрица конвертаций

| Из \ В | PDF | TXT | HTML | MD | DOCX |
|--------|-----|-----|------|----|------|
| DOCX | ✅ LO | ✅ LO | — | — | — |
| ODT | ✅ LO | ✅ LO | — | — | — |
| RTF | ✅ LO | — | — | — | — |
| TXT | ✅ LO | — | — | — | ✅ Pandoc |
| HTML | ✅ LO | — | — | ✅ Pandoc | — |
| MD | ✅ LO+Pandoc | — | ✅ Pandoc | — | — |

LO = LibreOffice headless, Pandoc = Pandoc CLI

## 4. Примеры options

### DOCX → PDF
```json
{
  "operationType": "doc.convert",
  "sourceFormat": "docx",
  "targetFormat": "pdf",
  "options": {}
}
```

### Markdown → HTML
```json
{
  "operationType": "doc.convert",
  "sourceFormat": "md",
  "targetFormat": "html",
  "options": {
    "charset": "utf-8"
  }
}
```

### Markdown → PDF (с выбором engine)
```json
{
  "operationType": "doc.convert",
  "sourceFormat": "md",
  "targetFormat": "pdf",
  "options": {
    "pdfEngine": "xelatex"
  }
}
```
Если `pdfEngine` не указан или XeLaTeX не установлен — автоматический fallback на Markdown → HTML → PDF через LibreOffice.

### TXT → DOCX
```json
{
  "operationType": "doc.convert",
  "sourceFormat": "txt",
  "targetFormat": "docx",
  "options": {}
}
```

### HTML → Markdown
```json
{
  "operationType": "doc.convert",
  "sourceFormat": "html",
  "targetFormat": "md",
  "options": {}
}
```

## 5. Интеграция с jobs

Все конвертации используют единый `operationType: "doc.convert"`. Маршрутизация происходит по `sourceFormat` + `targetFormat` внутри handler-а.

```
Frontend: POST /api/files/upload
  file: document.docx
  operationType: doc.convert
  targetFormat: pdf

Backend: INSERT file_jobs
  source_format: docx
  target_format: pdf
  operation_type: doc.convert

Worker: handleDocConvert()
  → CONVERSION_TABLE["docx:pdf"]
  → tool: libreoffice
  → convertWithLibreOffice()
```

## 6. Ограничения форматов

| Ограничение | Описание |
|-------------|----------|
| DOCX → PDF: сложная вёрстка | LibreOffice может отрендерить таблицы/графики не идентично MS Word |
| RTF → PDF: старые RTF | Очень старые RTF (Word 6.0) могут конвертироваться с артефактами |
| HTML → PDF: JavaScript | LibreOffice не исполняет JS — динамический контент не отрендерится |
| HTML → PDF: внешние ресурсы | CSS/изображения по URL не загружаются (безопасность) |
| Markdown → PDF: LaTeX | Без texlive качество PDF ниже (через HTML→PDF fallback) |
| TXT → PDF: кодировка | Предполагается UTF-8. Другие кодировки могут дать кракозябры |
| Размер файла | Таймаут 120 сек. Файлы >50MB могут не успеть |
| Параллельность | Каждый вызов LibreOffice = отдельный процесс (~100MB RAM) |

## 7. Что предупреждать пользователю в UI

### На странице инструмента:

```
⚠️ DOCX → PDF
Конвертация выполняется через LibreOffice. Результат может незначительно
отличаться от оригинала в Microsoft Word — особенно сложные таблицы,
нестандартные шрифты и макросы.

⚠️ HTML → PDF
Конвертируется только статический HTML. JavaScript не исполняется.
Внешние изображения и стили по URL не загружаются.

⚠️ Markdown → PDF
Для лучшего качества PDF используется LaTeX. Если LaTeX недоступен,
конвертация идёт через промежуточный HTML — результат может быть проще.

⚠️ TXT → PDF / TXT → DOCX
Файл должен быть в кодировке UTF-8. Другие кодировки могут
отображаться некорректно.

ℹ️ Общее
Максимальный размер файла: 50 МБ.
Время обработки: обычно 5-30 секунд, для больших файлов — до 2 минут.
```

### В истории при ошибке:

```
❌ Таймаут конвертации (120с). Файл слишком большой или сложный.
❌ LibreOffice не установлен на сервере.
❌ Конвертация docx → mp3 не поддерживается.
```

## 8. Обработка ошибок

| Ошибка | HTTP | Retry | Действие |
|--------|------|-------|----------|
| Неподдерживаемая пара форматов | — | Нет | ERROR с перечислением доступных |
| LibreOffice не установлен | — | Нет | ERROR с инструкцией |
| Pandoc не установлен | — | Нет | ERROR с инструкцией |
| Таймаут LibreOffice | — | Да | Retry до 3 раз |
| Таймаут Pandoc | — | Да | Retry до 3 раз |
| Повреждённый файл | — | Нет | ERROR |
| LibreOffice не создал файл | — | Да | Retry (иногда LO зависает) |
| Нехватка RAM | — | Да | Retry |
| XeLaTeX не установлен | — | — | Автоматический fallback на HTML→PDF |

Все временные файлы (temp input, LibreOffice profile) очищаются в `finally` блоке.
