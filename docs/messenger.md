# Мессенджер AgroDesk

Внутренний чат организации: личные (direct) и групповые переписки между сотрудниками одной org.
Администраторы дополнительно могут писать **администратору другого хозяйства** (целевой выбор, без общего чата «для всех»).

## Назначение

- Быстрая связь внутри хозяйства без внешнего мессенджера.
- Связь admin↔admin между организациями (поиск по названию и фильтр по региону).
- Уведомления в колокольчике (`new_message`) и опционально в Telegram.
- Realtime через SSE; при недоступности — poll ~30 с.

## Direct vs group

| Тип | Кто создаёт | Участники | Приватность |
|-----|-------------|-----------|-------------|
| **direct** (своя org) | любой сотрудник | ровно двое | Админ **не** видит чужие личные переписки |
| **direct** (cross-org) | только **admin** | два admin из разных org | Видят только участники; `is_cross_org=true` |
| **group** | только **admin** | 2+ своей org | Админ видит все группы в списке (модерация); история — только участникам |

Идемпотентность direct: повторный запрос той же пары возвращает тот же чат.

## Права и роли

- `/messenger` доступен **всем ролям** организации.
- Создание/редактирование групп — `require_admin`.
- Межорганизационный чат и `GET /external-admins` — **только admin**.
- Сообщения и unread — только активным участникам.
- Справочник коллег: `GET /api/messenger/peers` (org-scoped).

## Org-изоляция

Обычные чаты привязаны к `org_id`. Cross-org DM хранится в org создателя (`chats.org_id`), у каждого участника свой `chat_members.org_id`; доступ по членству.

## Realtime (SSE)

- `GET /api/messenger/events?token=<JWT>`
- Для cross-org событие публикуется в org каждого участника отдельно.
- Poll ~30 с — safety net.

## API (кратко)

- `GET /chats`, `GET /peers`, `GET /external-admins` (admin), `GET /events`
- `POST /chats/direct` (`cross_org: true` для admin↔admin), `POST /chats/group` (admin)
- `PATCH /chats/{id}` (admin, group)
- `GET|POST /chats/{id}/messages`, `POST /chats/{id}/read`

## Тесты

```bash
cd backend && pytest tests/test_messenger_api.py -q
npx playwright test e2e/messenger.spec.ts
```
