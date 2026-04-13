# UX States Audit — «Мастерская файлов»

## 1. Все UI-состояния проекта

| Область | Состояние | Компонент | Статус |
|---------|-----------|-----------|--------|
| Workspace | idle | LandingPage | ✅ |
| Workspace | file-loaded | WorkspacePreview + hint | ✅ |
| Workspace | file unsupported | UnsupportedFormat | ✅ NEW |
| Workspace | editing | Preview + Panel | ✅ |
| Workspace | processing | Preview overlay + spinner | ✅ |
| Workspace | done | Footer green + download | ✅ |
| Workspace | error | Footer red + retry | ✅ |
| Profile | loading | LoadingState skeleton | ✅ UPDATED |
| Profile | empty history | EmptyState | ✅ UPDATED |
| Profile | data loaded | ProfileCard + Stats + History | ✅ |
| History | loading | LoadingState skeleton | ✅ UPDATED |
| History | empty (no filters) | EmptyState + CTA | ✅ UPDATED |
| History | empty (with filters) | EmptyState "измените фильтры" | ✅ NEW |
| History | data loaded | HistoryTable + Pagination | ✅ |
| Auth | form idle | LoginForm / RegisterForm | ✅ |
| Auth | submitting | Spinner in button | ✅ |
| Auth | error | Red alert box | ✅ |
| Auth | success | Redirect | ✅ |
| Dropzone | idle | Upload icon + text | ✅ |
| Dropzone | drag over | Breathe animation + scale | ✅ |
| Dropzone | file too large | Error text | ✅ |
| Compress | quality warning | Warning badge | ✅ NEW |
| Convert | format warnings | Warning badges | ✅ NEW |
| Remove BG | before/after | Toggle + checkerboard | ✅ |

## 2. Reusable state components

```
components/shared/
├── empty-state.tsx        # Пустое состояние с иконкой, текстом, CTA
├── error-state.tsx        # Ошибка с retry кнопкой
├── loading-state.tsx      # Spinner или skeleton shimmer
├── unsupported-format.tsx # Неподдерживаемый формат + список поддерживаемых
├── file-too-large.tsx     # Превышен лимит + ссылка на тарифы
├── skeleton.tsx           # Shimmer skeleton
└── pagination.tsx         # Пагинация
```

## 3. Accessibility

- Все state-компоненты имеют `role="status"` или `role="alert"`
- Loading states имеют `aria-label`
- Кнопки имеют `disabled` при загрузке
- Dropzone имеет `role="button"`, `tabIndex={0}`, keyboard handler
- `@media (prefers-reduced-motion: reduce)` отключает все анимации
- Формы имеют `htmlFor` на label → input
- Ошибки валидации связаны с полями

## 4. Checklist ручного тестирования

### Workspace
- [ ] Загрузить JPG → burger menu показывает 10+ действий
- [ ] Загрузить PDF → burger menu показывает PDF-действия
- [ ] Загрузить .exe → показывается UnsupportedFormat
- [ ] Загрузить файл >250MB → ошибка в dropzone
- [ ] Выбрать compress → slider + прогноз размера
- [ ] Выбрать convert JPG→PNG → "без потери качества"
- [ ] Выбрать convert PNG→JPG → предупреждение о прозрачности
- [ ] Выбрать resize → drag handles + поля W/H
- [ ] Выбрать remove-bg → checkerboard + кисть
- [ ] Нажать "Обработать" → processing overlay → done footer
- [ ] Нажать "Скачать" → файл скачивается
- [ ] Нажать "Другое действие" → возврат к burger menu
- [ ] Нажать "Новый файл" → возврат к landing

### Auth
- [ ] Регистрация с валидными данными → redirect
- [ ] Регистрация с дублирующим email → ошибка
- [ ] Вход с неверным паролем → ошибка
- [ ] Вход → redirect на главную
- [ ] Выход → кнопка "Войти" в header

### Profile
- [ ] Без операций → EmptyState с CTA
- [ ] С операциями → карточки + stats
- [ ] Stats: нет отрицательной экономии

### History
- [ ] Без записей → EmptyState
- [ ] С фильтрами без результатов → "Измените фильтры"
- [ ] Скачивание из истории работает
- [ ] Удаление записи работает

### Тарифы
- [ ] Переключатель месяц/год
- [ ] Годовая: скидка + экономия
- [ ] Месячная: подсказка про годовую
- [ ] Pro: "Высокий лимит" (не "безлимит")

### Responsive
- [ ] Mobile: header компактный
- [ ] Mobile: dropzone адаптивен
- [ ] Mobile: тарифы в колонку
- [ ] Mobile: workspace panel скрывается (TODO)
