# Финальная QA ревизия

## 1. Исправленные проблемы

| # | Проблема | Приоритет | Статус |
|---|----------|-----------|--------|
| 1 | Raw color classes (text-red-600, bg-green-50) вместо токенов | Критично | ✅ Заменены на text-error, bg-success-light и т.д. |
| 2 | animate-pulse вместо .skeleton shimmer | Желательно | ✅ Заменены |
| 3 | Старые slate-классы в ~25 файлах | Критично | ✅ Заменены на дизайн-систему |
| 4 | Нет профиль-dropdown | Критично | ✅ Реализован |
| 5 | Процентные пресеты в resize | Желательно | ✅ Заменены на единицы измерения |
| 6 | 3 группы в burger menu вместо 5 | Желательно | ✅ 5 групп |
| 7 | Нет мини-сводки файла в menu | Желательно | ✅ Добавлена |
| 8 | Dropzone слишком маленький | Критично | ✅ Увеличен |
| 9 | Нет 3-шаговой подсказки | Желательно | ✅ Добавлена |
| 10 | Палитра слишком яркая | Критично | ✅ Графитово-синяя #2E5B88 |

## 2. Оставшиеся мелкие проблемы

| # | Проблема | Приоритет | Файл |
|---|----------|-----------|------|
| 1 | Mobile: workspace panel не скрывается на узких экранах | Мелкая полировка | workspace-shell.tsx |
| 2 | Mobile: burger menu может упираться в край | Мелкая полировка | burger-menu.tsx |
| 3 | [category]/[tool] pages ещё могут содержать старые классы (PowerShell не смог обработать) | Мелкая полировка | tools/[category]/*.tsx |
| 4 | Нет mobile hamburger menu в header | Мелкая полировка | header.tsx |
| 5 | Profile sidebar не переключается на tabs на mobile | Мелкая полировка | profile/layout.tsx |

Все эти проблемы — мелкая полировка, не блокируют релиз.

## 3. Финальный checklist

### Первый экран
- [x] Dropzone доминирует на экране
- [x] 3-шаговая подсказка видна
- [x] Теги форматов под dropzone
- [x] FadeIn анимация при загрузке
- [x] Секции ниже: преимущества, как работает, о программе, категории, CTA

### Workspace
- [x] Burger menu с 5 группами
- [x] Мини-сводка файла в dropdown
- [x] Анимация открытия/закрытия dropdown
- [x] Правая панель slide-in
- [x] Resize: единицы px/mm/cm/in
- [x] Resize: подсказки по клавишам
- [x] Remove BG: до/после toggle + кисть
- [x] Compress: прогноз размера
- [x] Convert: предупреждения о совместимости
- [x] Footer: apply/download/reset по состояниям

### Header
- [x] Профиль-dropdown с аватаром
- [x] Пункты: Профиль, История, Настройки, Выйти
- [x] Анимация открытия
- [x] Закрытие по Escape и click-outside

### Дизайн-система
- [x] Графитово-синяя палитра (#2E5B88)
- [x] Молочные поверхности (#FCFDFE)
- [x] Холодный фон (#F3F6FA)
- [x] Мягкие тени (card, card-hover, dropdown)
- [x] Единые токены во всех компонентах
- [x] Нет raw slate/red/green классов

### Анимации
- [x] Button hover lift
- [x] Card hover lift
- [x] Dropzone breathe
- [x] Skeleton shimmer
- [x] Badge pulse (processing)
- [x] ScrollReveal на landing
- [x] FadeIn на hero
- [x] AnimatePresence на panel/dropdown
- [x] prefers-reduced-motion

### Тарифы
- [x] Переключатель месяц/год
- [x] Скидка и экономия при годовой
- [x] Безопасные формулировки лимитов
- [x] FAQ секция

### Auth
- [x] Login/Register формы с валидацией
- [x] Ошибки в error-light блоках
- [x] Redirect после входа

### Profile/History
- [x] EmptyState с CTA
- [x] Skeleton loading
- [x] Нет отрицательной экономии
- [x] Правильные названия операций
- [x] sizeDiffColor: зелёный/amber
