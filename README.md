# АгроДеск

Веб-платформа (PWA) для управления крестьянско-фермерским хозяйством.

## Быстрый старт

```bash
npm install
npm run dev        # localhost:5173 с MSW моками
npm run build      # production сборка
npm run test       # unit тесты Vitest
npx playwright test  # E2E тесты
```

## Структура

```
src/app/routes/    — страницы (TanStack Router)
src/features/      — бизнес-логика по модулям
src/components/    — переиспользуемые компоненты
src/mocks/         — MSW моки (только в dev)
src/types/         — TypeScript типы
src/lib/           — утилиты (api.ts, db.ts, sync.ts)
```

## Переключение на боевой бэкенд

1. Создай Managed PostgreSQL в Яндекс Облако
2. В `.env.production` измени `VITE_USE_MOCKS=false` и `VITE_API_URL=<твой адрес>`
3. Схема таблиц PostgreSQL аналогична MSW-мокам (см. `src/mocks/handlers/`)
4. `npm run build` → деплой в Yandex Object Storage

## Telegram-бот

`bot/` — Python/aiogram бот (работает независимо)

В Этапе 2 бот переходит с Google Sheets на тот же PostgreSQL.

## Хостинг

Яндекс Object Storage (CDN статика) + Яндекс Managed PostgreSQL.

Автодеплой через GitHub Actions при push в `main`.
