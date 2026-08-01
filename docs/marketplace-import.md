# Маркетплейс — импорт из склада и отгрузок (MVP)

## Односторонний snapshot

Импорт из `inventory_items` / `shipments` в `market_listings` — **только чтение** исходных таблиц.

- Эндпоинты `/api/inventory/*` и `/api/shipments/*` не изменяются и не вызываются на запись.
- `POST /api/marketplace/listings/from-source` создаёт черновик (`draft`) с копией названия, количества и единицы на момент импорта.
- **`quantity_available` в объявлении — snapshot**, не живая ссылка на остаток склада или тоннаж отгрузки. Изменение остатка на складе после импорта **не** обновляет listing автоматически; продавец правит объявление вручную.
- Импорт **не** резервирует и **не** списывает реальные остатки. Синхронизация остатков в реальном времени — вне scope MVP.
- Повторный импорт того же `(source_type, source_id)` при активном статусе (`draft` / `pending_review` / `published`) возвращает **HTTP 409**.
- Категория маркетплейса при импорте со склада подставляется через таблицу
  `market_category_mapping` (код ТМЦ → `market_categories`), если маппинг задан
  суперадмином. Без маппинга `category_id` остаётся пустым — продавец выбирает
  категорию вручную перед модерацией. Таблица `inventory_items` **не** меняется.

Права: `marketplace.manage` (Level-2 action_permissions).

См. также комментарии в `backend/app/services/marketplace_import.py`.

Публичная витрина (без JWT): [marketplace-public.md](./marketplace-public.md).

Кабинет продавца (JWT + `marketplace.manage`): `/api/marketplace/seller-profile`,
`/listings`, `/orders` — см. `backend/app/services/marketplace_seller.py`.

Модерация суперадмина: `/superadmin/api/marketplace/*` —
`backend/app/services/marketplace_moderation.py` (существующий SuperAdmin JWT).
