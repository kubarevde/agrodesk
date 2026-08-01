# Маркетплейс — публичная витрина (MVP)

## Анонимный доступ

Префикс `/api/public/marketplace/*` **исключён** из `OrgContextMiddleware`
(тот же паттерн, что `/api/auth`) — JWT не требуется.

Организационные маршруты `/api/marketplace/*` (кабинет продавца) по-прежнему
требуют JWT + `org_id` + `marketplace.manage`.

## Видимость

В каждом публичном запросе:

- `market_listings.status = 'published'`
- `organizations.is_active = true`
- `organizations.settings.marketplace_enabled = true`
- `market_seller_profiles.is_active = true`

Черновики, модерация и объявления орг без флага / неактивных орг → **404**,
даже при прямом обращении по id.

Ответ не содержит `org_id`, `source_*`, складских остатков и внутренних цен закупки —
только то, что продавец опубликовал.

## Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/listings` | Список + фильтры (категория, цена, `q`) + пагинация |
| GET | `/listings/{id}` | Карточка + краткий продавец |
| GET | `/categories` | Дерево активных категорий |
| GET | `/sellers/{id}` | Профиль магазина + published листинги + видимые отзывы |
| POST | `/orders` | Заявка на покупку (rate-limit по IP) |

См. `backend/app/services/marketplace_public.py`.
