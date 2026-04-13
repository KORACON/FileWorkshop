# Аудит текущего кода и план рефакторинга

## 1. Инвентаризация текущих компонентов

### Страницы (app/)

| Файл | Роль сейчас | Решение |
|------|-------------|---------|
| `app/page.tsx` | Главная: dropzone → action picker → form → process → result. 250 строк, 6 состояний, вся логика в одном файле | **Разобрать** на workspace shell + отдельные панели |
| `app/login/page.tsx` | Вход | Оставить |
| `app/register/page.tsx` | Регистрация | Оставить |
| `app/pricing/page.tsx` | Тарифы (статичные) | Переделать (промт 8) |
| `app/profile/page.tsx` | Обзор профиля | Оставить, исправить баг с отрицательной экономией |
| `app/profile/history/page.tsx` | История | Оставить |
| `app/profile/settings/page.tsx` | Настройки | Оставить |
| `app/tools/page.tsx` | Каталог инструментов | Оставить как вторичную навигацию |
| `app/tools/[category]/page.tsx` | Категория | Оставить |
| `app/tools/[category]/[tool]/page.tsx` | Страница инструмента | Упростить — перенаправлять на workspace |

### Компоненты (components/tools/)

| Файл | Роль сейчас | Новая роль |
|------|-------------|------------|
| `universal-dropzone.tsx` | Dropzone на главной | **Переиспользовать** в workspace idle state |
| `action-picker.tsx` | Карточки действий после загрузки | **Заменить** на burger menu |
| `file-preview.tsx` | Маленькая строка с именем файла | **Расширить** до полноценного preview area |
| `image-resize-editor.tsx` | Canvas-редактор resize | **Переиспользовать** как панель инструмента внутри workspace |
| `operation-form.tsx` | Динамическая форма параметров | **Переиспользовать** как parameter panel |
| `job-status.tsx` | Статусы QUEUED/PROCESSING/DONE/ERROR | **Переиспользовать** в workspace footer |
| `tool-card.tsx` | Карточка в каталоге | Оставить для /tools |
| `tool-grid.tsx` | Сетка карточек | Оставить для /tools |
| `tool-page-content.tsx` | Старый flow инструмента | **Удалить** — заменяется workspace |
| `batch-uploader.tsx` | Multi-file upload | Оставить для merge PDF |
| `file-dropzone.tsx` | Старый dropzone (привязан к Tool) | **Удалить** — заменён universal-dropzone |

### Hooks

| Файл | Решение |
|------|---------|
| `use-upload.ts` | Переиспользовать без изменений |
| `use-job-polling.ts` | Переиспользовать без изменений |
| `use-history.ts` | Переиспользовать без изменений |

### Stores

| Файл | Решение |
|------|---------|
| `auth-store.ts` | Переиспользовать. Добавить workspace state в отдельный store |

### Данные

| Файл | Решение |
|------|---------|
| `tools/_data/tools-registry.ts` | **Рефакторить** в capability-registry с uiMode |

## 2. Целевая архитектура file workspace

```
┌─────────────────────────────────────────────────────────┐
│ Header: Logo | Инструменты | Тарифы | Профиль           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─ Workspace Shell ──────────────────────────────────┐ │
│  │                                                     │ │
│  │  ┌─ Toolbar ─────────────────────────────────────┐ │ │
│  │  │ [☰ Действия ▾]  file.jpg  1920×1080  2.3 MB  │ │ │
│  │  └───────────────────────────────────────────────┘ │ │
│  │                                                     │ │
│  │  ┌─ Preview Area ──────┐  ┌─ Parameter Panel ────┐ │ │
│  │  │                     │  │                       │ │ │
│  │  │   [изображение]     │  │  Качество: ━━●━━ 85  │ │ │
│  │  │                     │  │                       │ │ │
│  │  │                     │  │  Формат: [PNG ▾]      │ │ │
│  │  │                     │  │                       │ │ │
│  │  └─────────────────────┘  └───────────────────────┘ │ │
│  │                                                     │ │
│  │  ┌─ Footer Actions ──────────────────────────────┐ │ │
│  │  │ [🚀 Обработать]  [⬇ Скачать]  [↩ Сбросить]   │ │ │
│  │  └───────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Footer                                                   │
└─────────────────────────────────────────────────────────┘
```

### Состояния workspace:

```
idle          → Dropzone по центру
file-loaded   → Preview + burger menu (без parameter panel)
editing       → Preview + parameter panel выбранного инструмента
processing    → Preview (затемнён) + spinner + progress
done          → Preview результата + скачать/сбросить/другое действие
error         → Preview + сообщение ошибки + retry
```

## 3. Новая структура компонентов

```
components/
├── layout/
│   ├── header.tsx                    # Без изменений
│   └── footer.tsx                    # Без изменений
│
├── workspace/                        # НОВАЯ ПАПКА — ядро
│   ├── workspace-shell.tsx           # Главный контейнер (state machine)
│   ├── workspace-toolbar.tsx         # Верхняя панель: burger + file info
│   ├── workspace-preview.tsx         # Центральная область preview
│   ├── workspace-footer.tsx          # Нижние кнопки: apply/download/reset
│   ├── burger-menu.tsx               # Выпадающее меню действий
│   └── panels/                       # Панели параметров по инструментам
│       ├── convert-panel.tsx         # Выбор формата + quality
│       ├── compress-panel.tsx        # Quality slider
│       ├── resize-panel.tsx          # Resize editor (из image-resize-editor)
│       ├── remove-bg-panel.tsx       # Threshold + будущая кисть
│       ├── rotate-panel.tsx          # 90/180/270
│       ├── crop-panel.tsx            # Crop area
│       ├── remove-exif-panel.tsx     # Просто кнопка
│       ├── pdf-compress-panel.tsx    # Quality select
│       ├── pdf-split-panel.tsx       # Просто кнопка
│       └── generic-panel.tsx         # Fallback: OperationForm
│
├── tools/                            # Оставляем для /tools страниц
│   ├── tool-card.tsx                 # Без изменений
│   ├── tool-grid.tsx                 # Без изменений
│   └── batch-uploader.tsx            # Для merge PDF
│
├── auth/                             # Без изменений
├── profile/                          # Без изменений
└── shared/                           # Без изменений
```

### Новые stores:

```
stores/
├── auth-store.ts                     # Без изменений
└── workspace-store.ts                # НОВЫЙ: file, selectedTool, options, state
```

### Новый capability registry:

```
lib/
├── api-client.ts                     # Без изменений
├── utils.ts                          # Без изменений
├── validations.ts                    # Без изменений
└── capability-registry.ts            # НОВЫЙ: заменяет tools-registry для workspace
```

## 4. Пошаговый migration plan

### Шаг 1: Создать workspace-store (не ломает ничего)

Новый файл `stores/workspace-store.ts`:
- file: File | null
- fileCategory: image | pdf | document
- selectedAction: Action | null
- options: Record<string, string>
- state: idle | file-loaded | editing | processing | done | error
- jobId: string | null
- actions: setFile, selectAction, setOptions, process, reset

Это Zustand store, отделённый от UI. Вся логика из page.tsx переедет сюда.

### Шаг 2: Создать capability-registry (не ломает ничего)

Новый файл `lib/capability-registry.ts`:
- Определяет Action (вместо Tool для workspace)
- Каждый Action имеет: id, name, icon, operationType, targetFormat, supportedInputs, uiPanel, options
- Функция `getActionsForFile(filename)` → Action[]
- Функция `getFileFamily(filename)` → 'image' | 'pdf' | 'document'

tools-registry.ts остаётся для /tools страниц. capability-registry — для workspace.

### Шаг 3: Создать workspace-shell (параллельно с текущей page.tsx)

Новый файл `components/workspace/workspace-shell.tsx`:
- Читает state из workspace-store
- Рендерит: toolbar + preview + panel + footer
- Пока не подключён к page.tsx — тестируем отдельно

### Шаг 4: Создать burger-menu

`components/workspace/burger-menu.tsx`:
- Получает actions из capability-registry
- Группирует: специальные → конвертации → обработка
- По клику → workspace-store.selectAction()

### Шаг 5: Создать workspace-preview

`components/workspace/workspace-preview.tsx`:
- Для изображений: показывает img с object-fit
- Для PDF: показывает иконку + имя + размер
- Для документов: иконка + имя
- В состоянии processing: overlay с spinner

### Шаг 6: Перенести панели инструментов

Каждый инструмент = отдельная панель в `components/workspace/panels/`:
- resize-panel.tsx ← из image-resize-editor.tsx (адаптировать)
- compress-panel.tsx ← из operation-form.tsx (quality slider)
- convert-panel.tsx ← из operation-form.tsx (format select)
- remove-bg-panel.tsx ← новый
- generic-panel.tsx ← fallback из operation-form.tsx

### Шаг 7: Создать workspace-footer

`components/workspace/workspace-footer.tsx`:
- Кнопки зависят от state:
  - editing: [Обработать] [Сбросить]
  - processing: [Отменить] (disabled)
  - done: [Скачать] [Другое действие] [Новый файл]
  - error: [Повторить] [Новый файл]

### Шаг 8: Подключить workspace к page.tsx

Заменить содержимое page.tsx:
```tsx
export default function HomePage() {
  return <WorkspaceShell />;
}
```

Вся логика — в workspace-store и workspace-shell. page.tsx становится тонкой обёрткой.

### Шаг 9: Удалить устаревшие компоненты

- `components/tools/action-picker.tsx` → заменён burger-menu
- `components/tools/tool-page-content.tsx` → заменён workspace
- `components/tools/file-dropzone.tsx` → заменён universal-dropzone

### Шаг 10: Обновить /tools/[category]/[tool] страницу

Вместо собственного flow — перенаправлять на главную с предвыбранным инструментом:
```tsx
// Redirect на workspace с query param
router.push(`/?tool=${toolId}`);
```

## 5. Что НЕ трогаем

| Область | Почему |
|---------|--------|
| Backend (NestJS) | Работает, API не меняется |
| Worker | Работает, handlers не меняются |
| Prisma schema | Не меняется |
| Auth (login/register) | Работает |
| Profile/History/Settings | Работают, мелкие фиксы позже |
| Hooks (use-upload, use-job-polling) | Переиспользуются как есть |
| API client | Не меняется |
| Types | Расширяются, не ломаются |

## 6. Технические риски

| # | Риск | Митигация |
|---|------|-----------|
| 1 | Потеря работающего upload flow при рефакторинге | Шаги 1-6 создают новые файлы, не трогая старые. Подключение в шаге 8 — одна замена |
| 2 | Resize editor сложно адаптировать под panel формат | Resize-panel оборачивает существующий editor, не переписывает его |
| 3 | State management усложняется | Zustand workspace-store изолирован от auth-store. Чёткий контракт |
| 4 | Burger menu на мобильных | Burger → bottom sheet на mobile. Заложить в архитектуру сразу |
| 5 | Preview для PDF/документов | Для MVP: иконка + имя + размер. Полноценный preview — позже |
| 6 | Параллельная работа старых /tools страниц | tools-registry остаётся. capability-registry — отдельный файл. Нет конфликта |
| 7 | Потеря SEO на главной (CSR) | Главная уже CSR. Для SEO есть /tools (SSR) |

## 7. Критерии готовности

### Workspace shell готов когда:

- [ ] Пользователь загружает файл → видит preview на холсте
- [ ] Burger menu показывает только совместимые действия
- [ ] Выбор действия открывает parameter panel справа/снизу
- [ ] Кнопка "Обработать" отправляет на backend и показывает progress
- [ ] После обработки — кнопка "Скачать" работает
- [ ] "Другое действие" возвращает к burger menu без потери файла
- [ ] "Новый файл" сбрасывает всё в idle
- [ ] Resize работает через drag handles
- [ ] Remove bg показывает результат
- [ ] Все существующие конвертации работают через workspace
- [ ] /tools страницы продолжают работать
- [ ] Auth/Profile/History не сломаны
