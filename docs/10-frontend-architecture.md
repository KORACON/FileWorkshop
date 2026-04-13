# Frontend Architecture — Next.js

## 1. App Router Structure

```
/                           → Главная (SSR)
/tools                      → Каталог инструментов (SSR)
/tools/images               → Категория: изображения (SSR)
/tools/pdf                  → Категория: PDF (SSR)
/tools/documents            → Категория: документы (SSR)
/tools/utilities            → Категория: утилиты (SSR)
/tools/[category]/[tool]    → Страница инструмента (CSR)
/auth/login                 → Вход (CSR)
/auth/register              → Регистрация (CSR)
/profile                    → Профиль (CSR, protected)
/profile/history            → История операций (CSR, protected)
/profile/settings           → Настройки аккаунта (CSR, protected)
/pricing                    → Тарифы (SSR)
/faq                        → FAQ (SSR)
/privacy                    → Политика конфиденциальности (SSR)
/terms                      → Условия использования (SSR)
```

### SSR vs CSR:

| Тип | Страницы | Почему |
|-----|----------|--------|
| SSR | Главная, каталог, категории, pricing, FAQ, privacy, terms | SEO, быстрая первая загрузка, контент не зависит от пользователя |
| CSR | Инструмент, auth, профиль, история, настройки | Интерактивность, зависимость от auth-состояния, polling |

## 2. Дерево файлов

```
apps/web/
├── app/
│   ├── layout.tsx                    # Root layout: providers, header, footer
│   ├── page.tsx                      # Главная
│   ├── not-found.tsx                 # 404
│   ├── error.tsx                     # Error boundary
│   ├── loading.tsx                   # Global loading
│   │
│   ├── (auth)/                       # Группа auth (без layout профиля)
│   │   ├── layout.tsx                # Минимальный layout для auth
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   │
│   ├── tools/
│   │   ├── page.tsx                  # Каталог всех инструментов
│   │   ├── [category]/
│   │   │   ├── page.tsx              # Инструменты категории
│   │   │   └── [tool]/
│   │   │       └── page.tsx          # Страница инструмента (upload + process)
│   │   └── _data/
│   │       └── tools-registry.ts     # Реестр всех инструментов
│   │
│   ├── profile/
│   │   ├── layout.tsx                # Layout профиля с sidebar
│   │   ├── page.tsx                  # Обзор профиля
│   │   ├── history/
│   │   │   └── page.tsx              # История операций
│   │   └── settings/
│   │       └── page.tsx              # Настройки аккаунта
│   │
│   ├── pricing/
│   │   └── page.tsx
│   ├── faq/
│   │   └── page.tsx
│   ├── privacy/
│   │   └── page.tsx
│   └── terms/
│       └── page.tsx
│
├── components/
│   ├── ui/                           # Базовые UI-компоненты
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown.tsx
│   │   ├── tabs.tsx
│   │   ├── toast.tsx
│   │   ├── skeleton.tsx
│   │   ├── spinner.tsx
│   │   ├── progress.tsx
│   │   └── pagination.tsx
│   │
│   ├── layout/
│   │   ├── header.tsx                # Навигация, auth-кнопки, язык
│   │   ├── footer.tsx
│   │   ├── sidebar.tsx               # Sidebar профиля
│   │   ├── mobile-nav.tsx
│   │   └── theme-toggle.tsx
│   │
│   ├── auth/
│   │   ├── login-form.tsx
│   │   ├── register-form.tsx
│   │   ├── auth-guard.tsx            # Protected route wrapper
│   │   └── guest-guard.tsx           # Redirect if logged in
│   │
│   ├── tools/
│   │   ├── tool-card.tsx             # Карточка инструмента в каталоге
│   │   ├── tool-grid.tsx             # Сетка карточек
│   │   ├── category-nav.tsx          # Навигация по категориям
│   │   ├── file-dropzone.tsx         # Drag-and-drop upload
│   │   ├── file-preview.tsx          # Превью загруженного файла
│   │   ├── operation-form.tsx        # Форма параметров операции
│   │   ├── job-status.tsx            # Статус задачи (polling)
│   │   ├── download-button.tsx       # Кнопка скачивания
│   │   └── batch-uploader.tsx        # Загрузка нескольких файлов
│   │
│   ├── profile/
│   │   ├── profile-card.tsx          # Карточка пользователя
│   │   ├── stats-widgets.tsx         # Виджеты статистики
│   │   ├── history-table.tsx         # Таблица истории
│   │   ├── history-filters.tsx       # Фильтры истории
│   │   ├── history-row.tsx           # Строка истории
│   │   ├── sessions-list.tsx         # Активные сессии
│   │   ├── change-password-form.tsx
│   │   └── delete-account-dialog.tsx
│   │
│   └── shared/
│       ├── file-size.tsx             # Форматирование размера
│       ├── date-display.tsx          # Форматирование даты
│       ├── empty-state.tsx           # Пустое состояние
│       ├── error-message.tsx         # Сообщение об ошибке
│       └── confirm-dialog.tsx        # Диалог подтверждения
│
├── lib/
│   ├── api-client.ts                 # HTTP-клиент (fetch wrapper)
│   ├── api-endpoints.ts              # Все API endpoints
│   ├── auth.ts                       # Auth утилиты
│   └── utils.ts                      # Общие утилиты
│
├── hooks/
│   ├── use-auth.ts                   # Auth state + actions
│   ├── use-upload.ts                 # Upload logic
│   ├── use-job-polling.ts            # Polling статуса задачи
│   ├── use-history.ts                # История с пагинацией
│   └── use-debounce.ts
│
├── stores/
│   └── auth-store.ts                 # Zustand: auth state
│
├── types/
│   ├── api.ts                        # API response types
│   ├── user.ts                       # User, Session
│   ├── job.ts                        # FileJob, JobStatus
│   ├── tool.ts                       # Tool, Category
│   └── history.ts                    # HistoryEntry, HistoryFilters
│
├── i18n/
│   ├── config.ts                     # i18n configuration
│   ├── ru.json                       # Русские строки
│   └── en.json                       # Английские строки
│
├── styles/
│   └── globals.css                   # Tailwind + custom styles
│
├── public/
│   ├── icons/                        # Иконки категорий
│   └── og-image.png                  # Open Graph
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 3. Компоненты — назначение

### UI (базовые)
| Компонент | Назначение |
|-----------|------------|
| `Button` | Кнопка с вариантами: primary, secondary, ghost, danger. Состояния: loading, disabled |
| `Input` | Текстовое поле с label, error, icon |
| `Card` | Контейнер с тенью, padding, border-radius |
| `Badge` | Статус-метка: QUEUED (серый), PROCESSING (синий), DONE (зелёный), ERROR (красный) |
| `Dialog` | Модальное окно |
| `Toast` | Уведомления (success, error, info) |
| `Skeleton` | Placeholder при загрузке |
| `Spinner` | Индикатор загрузки |
| `Progress` | Прогресс-бар |
| `Pagination` | Пагинация для истории |

### Tools (инструменты)
| Компонент | Назначение |
|-----------|------------|
| `FileDropzone` | Drag-and-drop зона. Показывает допустимые форматы, лимит размера. Превью файла после загрузки |
| `FilePreview` | Превью: имя, размер, иконка формата. Кнопка удаления |
| `OperationForm` | Динамическая форма параметров: quality slider, size inputs, page selector, format dropdown |
| `JobStatus` | Polling статуса: spinner → progress → результат/ошибка. Автоматический polling каждые 2 сек |
| `DownloadButton` | Кнопка скачивания с размером файла. Показывает экономию: "2.3 MB → 1.1 MB (−52%)" |
| `BatchUploader` | Загрузка нескольких файлов. Список с индивидуальным статусом каждого |
| `ToolCard` | Карточка в каталоге: иконка, название, описание, форматы |
| `CategoryNav` | Горизонтальная навигация по категориям с иконками |

### Profile (профиль)
| Компонент | Назначение |
|-----------|------------|
| `ProfileCard` | Аватар (инициалы), email, имя, дата регистрации |
| `StatsWidgets` | 4 карточки: всего операций, изображений, PDF, сэкономлено |
| `HistoryTable` | Таблица: файл, операция, статус, размер до/после, дата, действия |
| `HistoryFilters` | Фильтры: статус, тип операции, дата от/до, поиск по имени |
| `HistoryRow` | Строка: badge статуса, имя файла, операция, размеры, кнопки (скачать, повторить, удалить) |
| `SessionsList` | Список активных сессий: IP, браузер, дата. Кнопка "Завершить" |

## 4. UI-состояния

### Страница инструмента — конечный автомат:

```
┌──────────┐     upload      ┌───────────┐    submit     ┌──────────┐
│  IDLE    │───────────────▶│  UPLOADED  │──────────────▶│ QUEUED   │
│          │                │            │               │          │
│ Dropzone │                │ Preview +  │               │ Spinner  │
│ visible  │                │ Options    │               │ "В очереди"│
└──────────┘                └───────────┘               └────┬─────┘
      ▲                          ▲                           │
      │ reset                    │ change file          polling
      │                          │                           │
      │                    ┌─────┴──────┐              ┌────▼──────┐
      │                    │   ERROR    │◀─────────────│PROCESSING │
      │                    │            │   error      │           │
      │                    │ Message +  │              │ Progress  │
      │                    │ Retry btn  │              │ "Обработка"│
      │                    └────────────┘              └────┬──────┘
      │                                                     │
      │                                                success
      │                                                     │
      │                    ┌────────────┐              ┌────▼──────┐
      └────────────────────│  ANOTHER   │◀─────────────│   DONE    │
           "Ещё файл"     │            │  new file    │           │
                           └────────────┘              │ Download  │
                                                       │ Size diff │
                                                       │ "Повторить"│
                                                       └───────────┘
```

### Состояния компонентов:

| Компонент | Состояния |
|-----------|-----------|
| FileDropzone | idle, dragover, uploading, uploaded, error |
| JobStatus | queued, processing, done, error |
| HistoryTable | loading, empty, data, error |
| AuthForms | idle, submitting, error, success |
| ProfileCard | loading (skeleton), loaded |
| DownloadButton | ready, downloading, downloaded |

## 5. Стратегия работы с API

### HTTP-клиент (lib/api-client.ts):

```
fetch wrapper с:
├── baseURL: process.env.NEXT_PUBLIC_API_URL
├── Автоматический Authorization: Bearer <token>
├── Автоматический refresh при 401
├── Единый формат ответа: { success, data, error }
├── Типизация через generics: api.get<User>('/profile')
└── Обработка сетевых ошибок
```

### Стратегия запросов:

| Данные | Инструмент | Кэширование |
|--------|-----------|-------------|
| Каталог инструментов | SSR (статические данные) | ISR 1 час |
| Профиль пользователя | TanStack Query | staleTime: 5 мин |
| История операций | TanStack Query | staleTime: 30 сек |
| Статус задачи | Custom polling hook | Нет кэша, polling 2 сек |
| Auth state | Zustand store | В памяти |
| Тарифы | SSR | ISR 1 час |

### Polling статуса задачи:

```
useJobPolling(jobId):
  1. GET /api/jobs/:id/status каждые 2 сек
  2. Если status === DONE или ERROR → остановить polling
  3. Если status === PROCESSING → показать progress
  4. Если 5 ошибок подряд → остановить, показать "Проверьте позже"
  5. При уходе со страницы → остановить polling
```

## 6. Стратегия Auth на frontend

### Хранение токенов:

```
Access Token  → Zustand store (в памяти)
                Не в localStorage (XSS-уязвимость)
                Не в cookie (CSRF-уязвимость)

Refresh Token → httpOnly cookie (устанавливается backend-ом)
                Недоступен из JavaScript
                Отправляется автоматически на /api/auth/*
```

### Поток авторизации:

```
1. Пользователь открывает сайт
2. Zustand store: accessToken = null
3. Вызов POST /api/auth/refresh (cookie отправится автоматически)
   ├── Успех → accessToken в store, user данные
   └── Ошибка → пользователь не авторизован
4. Все API-запросы: Authorization: Bearer <accessToken>
5. При 401 → автоматический refresh → повтор запроса
6. Если refresh тоже 401 → logout, redirect на /auth/login
```

### Protected routes:

```tsx
// components/auth/auth-guard.tsx
// Оборачивает страницы, требующие авторизации
// Показывает skeleton пока проверяется auth
// Redirect на /auth/login если не авторизован
```

### Guest routes:

```tsx
// components/auth/guest-guard.tsx
// Для /auth/login и /auth/register
// Redirect на /profile если уже авторизован
```

## 7. Дизайн-система

### Цветовая палитра (Tailwind):

```
Primary:    blue-600 / blue-500 (hover)     — основные действия
Success:    green-600                        — DONE, успех
Error:      red-600                          — ERROR, ошибки
Warning:    amber-500                        — предупреждения
Neutral:    slate-50 → slate-900            — фоны, текст, borders
Background: white (light) / slate-950 (dark)
```

### Блоки главной страницы:

```
┌─────────────────────────────────────────────────┐
│ Header: Logo | Инструменты | Тарифы | Войти     │
├─────────────────────────────────────────────────┤
│                                                  │
│  Hero: "Мастерская файлов"                       │
│  Подзаголовок + CTA кнопка                       │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Категории (4 карточки):                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐│
│  │🖼 Изобра-│ │📄 PDF    │ │📝 Доку-  │ │🗜 Ар││
│  │  жения   │ │          │ │  менты   │ │хивы ││
│  │ 12 инстр.│ │ 10 инстр.│ │ 11 инстр.│ │6 инс││
│  └──────────┘ └──────────┘ └──────────┘ └─────┘│
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Популярные инструменты (сетка 3×2):             │
│  JPG→PNG | Сжать PDF | DOCX→PDF                  │
│  Resize  | Merge PDF | MD→HTML                   │
│                                                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Преимущества (3 колонки):                       │
│  🔒 Безопасно | ⚡ Быстро | 💰 Бесплатно        │
│                                                  │
├─────────────────────────────────────────────────┤
│ Footer: Ссылки | Политика | © 2025               │
└─────────────────────────────────────────────────┘
```

### Страница инструмента:

```
┌─────────────────────────────────────────────────┐
│ Breadcrumb: Инструменты > Изображения > JPG→PNG  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Заголовок: "Конвертировать JPG в PNG"            │
│  Описание: "Загрузите JPG, получите PNG"          │
│                                                  │
│  ┌─────────────────────────────────────────┐     │
│  │                                         │     │
│  │     📁 Перетащите файл сюда             │     │
│  │     или нажмите для выбора              │     │
│  │                                         │     │
│  │     JPG, до 50 МБ                       │     │
│  │                                         │     │
│  └─────────────────────────────────────────┘     │
│                                                  │
│  [После загрузки:]                               │
│  ┌──────────────────────────────────┐            │
│  │ 📷 photo.jpg  2.3 MB    ✕       │            │
│  └──────────────────────────────────┘            │
│                                                  │
│  Параметры:                                      │
│  Качество: [━━━━━━━━━●━━] 85                     │
│                                                  │
│  [ 🚀 Конвертировать ]                           │
│                                                  │
│  [После обработки:]                              │
│  ✅ Готово! 2.3 MB → 1.8 MB (−22%)              │
│  [ ⬇ Скачать PNG ] [ 🔄 Ещё файл ]             │
│                                                  │
└─────────────────────────────────────────────────┘
```

### Профиль:

```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │ Content                               │
│          │                                       │
│ 👤 Обзор │ ┌─────────┐ ┌─────────┐              │
│ 📋 Исто- │ │ 142     │ │ 89      │              │
│    рия   │ │ операций│ │ изображ.│              │
│ ⚙ Настр. │ └─────────┘ └─────────┘              │
│          │ ┌─────────┐ ┌─────────┐              │
│          │ │ 38      │ │ −45%    │              │
│          │ │ PDF     │ │ экономия│              │
│          │ └─────────┘ └─────────┘              │
│          │                                       │
│          │ Последние операции:                    │
│          │ ┌────────────────────────────────┐    │
│          │ │ photo.jpg → PNG  ✅ 2.3→1.8MB │    │
│          │ │ doc.docx → PDF   ✅ 1.1→0.9MB │    │
│          │ │ scan.pdf compress ❌ ошибка    │    │
│          │ └────────────────────────────────┘    │
└──────────┴──────────────────────────────────────┘
```

## 8. Реестр инструментов

Все инструменты описываются декларативно в одном файле. UI генерируется автоматически.

```typescript
// app/tools/_data/tools-registry.ts

interface Tool {
  id: string;                    // URL slug: "jpg-to-png"
  category: Category;            // "images" | "pdf" | "documents" | "utilities"
  operationType: string;         // "image.convert"
  name: { ru: string; en: string };
  description: { ru: string; en: string };
  icon: string;                  // Emoji или иконка
  sourceFormats: string[];       // ["jpg", "jpeg"]
  targetFormat?: string;         // "png" (null для compress/rotate)
  acceptMime: string[];          // ["image/jpeg"]
  maxFileSize: number;           // В байтах
  options: ToolOption[];         // Параметры формы
  popular?: boolean;             // Показывать на главной
}

interface ToolOption {
  key: string;                   // "quality"
  type: "slider" | "select" | "number" | "text" | "pages";
  label: { ru: string; en: string };
  default: string;
  min?: number;
  max?: number;
  choices?: Array<{ value: string; label: { ru: string; en: string } }>;
}
```

Преимущества:
- Добавление нового инструмента = добавление объекта в массив
- UI формы генерируется из `options`
- Валидация на клиенте из `sourceFormats` и `maxFileSize`
- SEO-страницы генерируются из `name` и `description`
- i18n из `{ ru, en }` полей

## 9. i18n Architecture (RU/EN-ready)

### Подход: namespace-based JSON + React context

```
i18n/
├── config.ts       # Определение языков, default locale
├── ru.json         # { "home.title": "Мастерская файлов", ... }
└── en.json         # { "home.title": "File Workshop", ... }
```

### Использование:

```tsx
// В компоненте:
const { t } = useTranslation();
<h1>{t('home.title')}</h1>

// В tools-registry:
name: { ru: 'JPG в PNG', en: 'JPG to PNG' }
```

### Переключение языка:
- Кнопка в header: RU / EN
- Сохранение в localStorage + cookie (для SSR)
- URL не меняется (один URL для всех языков)
- Позже можно перейти на /ru/ /en/ prefix если нужен SEO по языкам

## 10. Профиль — UX

### Обзор профиля (/profile):
- Карточка пользователя: email, имя, дата регистрации
- 4 виджета статистики (TanStack Query, staleTime: 5 мин)
- Последние 5 операций (ссылка на полную историю)
- Быстрые действия: "Конвертировать файл", "Посмотреть историю"

### История (/profile/history):
- Таблица с пагинацией (20 записей на страницу)
- Фильтры: статус (все/done/error), тип операции (dropdown), дата (от-до)
- Каждая строка: имя файла, операция, статус (badge), размер до→после, дата
- Действия на строке: скачать результат, скачать оригинал, повторить, удалить
- "Повторить" → переход на страницу инструмента с предзаполненными параметрами
- "Удалить" → confirm dialog → soft delete
- "Очистить всю историю" → confirm dialog

### Настройки (/profile/settings):
- Изменение имени
- Смена пароля (текущий + новый + подтверждение)
- Активные сессии (список с кнопкой "Завершить")
- "Завершить все сессии кроме текущей"
- Удаление аккаунта (danger zone, confirm dialog с вводом email)

### Навигация профиля:
- Desktop: sidebar слева (обзор, история, настройки)
- Mobile: tabs сверху
- Активный пункт подсвечен
- Badge с количеством новых операций (опционально)
