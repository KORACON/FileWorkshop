# Motion Guidelines — «Мастерская файлов»

## Принципы

1. Анимации помогают понять действие, а не развлекают
2. Короткие и спокойные: 140-240ms для hover, 200-300ms для появления
3. Одинаковый easing везде: cubic-bezier(0.25, 0.1, 0.25, 1)
4. Никаких бесконечных анимаций кроме spinner, shimmer и badge-pulse
5. prefers-reduced-motion отключает всё

## Реализованные анимации

### CSS (globals.css) — для частых взаимодействий:
| Элемент | Анимация | Длительность |
|---------|----------|-------------|
| btn-primary hover | translateY(-1px) + shadow | 150ms |
| btn-primary active | translateY(0) | 150ms |
| card-interactive hover | translateY(-2px) + shadow-hover | 200ms |
| dropzone drag-over | border/bg breathe | 1s infinite alternate |
| input-field focus | shadow-focus ring | 150ms |
| skeleton | shimmer gradient sweep | 1.5s infinite |
| badge-processing | opacity pulse | 2s infinite |
| spinner | rotate 360° | 0.8s infinite |
| Все transitions | duration-150 или duration-200 | — |

### Framer-motion — для сложных появлений:
| Элемент | Анимация | Длительность |
|---------|----------|-------------|
| Hero заголовок | FadeIn (opacity + translateY) | 400ms |
| Hero dropzone | FadeIn delay=120ms | 400ms |
| Hero format tags | FadeIn delay=200ms | 400ms |
| Landing секции | ScrollReveal (once) | 500ms |
| Benefits карточки | ScrollReveal cascade (80ms delay) | 500ms |
| How-it-works шаги | ScrollReveal cascade (120ms delay) | 500ms |
| Workspace right panel | AnimatePresence width 0→288 | 200ms |
| Burger menu dropdown | fade + slide-up + scale | 150ms |
| Profile dropdown | fade + slide-up + scale | 150ms |
| Pricing price change | opacity + translateY | 250ms |
| Pricing savings badge | opacity + height | 200ms |

## Где анимации НЕ нужны
- Юридические страницы (privacy, terms)
- Таблицы истории (скорость важнее красоты)
- Формы настроек (кроме focus и success)
- FAQ секция

## Производительность
- CSS transitions предпочтительнее framer-motion для hover/focus
- framer-motion только для mount/unmount и scroll-triggered
- `will-change: transform` не ставим глобально — только на анимируемые элементы
- `transform` и `opacity` — единственные анимируемые свойства (GPU-accelerated)
- Никогда не анимируем width/height/margin/padding напрямую
