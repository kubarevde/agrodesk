# Мессенджер AgroDesk

Внутренний чат организации: личные (direct) и групповые переписки между сотрудниками одной org.

## Назначение

- Быстрая связь внутри хозяйства без внешнего мессенджера.
- Уведомления в колокольчике (`new_message`) и опционально в Telegram.
- Realtime через SSE; при недоступности — poll ~30 с.

## Direct vs group

| Тип | Кто создаёт | Участники | Приватность |
|-----|-------------|-----------|-------------|
| **direct** | любой сотрудник | ровно двое | Админ **не** видит чужие личные переписки |
| **group** | только **admin** | 2+ | Админ видит все группы в списке (модерация); история — только участникам |

Идемпотентность direct: повторный запрос той же пары возвращает тот же чат.

## Права и роли

- `/messenger` доступен **всем ролям** организации (не Level-1 section).
- Создание/редактирование групп — `require_admin`.
- Сообщения и unread — только активным участникам (`chat_members`, `chat_message_reads`).
- Справочник коллег для «Новый чат»: `GET /api/messenger/peers` (org-scoped, без manager grant).

## Org-изоляция

Все сущности чата привязаны к `org_id`. Чужой org не видит чаты/историю (403/404).

## Realtime (SSE) и poll

- Endpoint: `GET /api/messenger/events?token=<JWT>` (EventSource; Bearer тоже принимается).
- События: `connected`, `new_message`, `message_read`, `new_chat`, `chat_updated`.
- Hub in-process: при нескольких воркерах uvicorn события могут не дойти до всех процессов — **poll остаётся safety net (~30 с даже при живом SSE)**.
- Клиент: `data-realtime="true|false"` на странице мессенджера.

## Unread

Источник истины для бейджа мессенджера — `chat_message_reads`.  
`notifications` с типом `new_message` — отдельный inbox/колокольчик, не заменяет chat unread.

## Галочки доставки / прочтения

Для **исходящих** сообщений UI показывает:
- 1 галочка (`delivery_status=delivered`) — сообщение сохранено на сервере;
- 2 галочки (`delivery_status=read`) — хотя бы один другой участник отметил чат как прочитанный до этого сообщения (watermark в `chat_message_reads`).

В группах: «прочитано» = прочитал **хотя бы один** другой участник (не квирум).  
Входящие сообщения галочки не показывают. Локальный optimistic send: `pending` до ответа API.  
Событие SSE `message_read` рассылается **всем** участникам чата, чтобы отправитель обновил галочки без ожидания poll.

## Telegram (опционально)

Нужно:

1. `TELEGRAM_BOT_TOKEN` в env backend (тот же бот, что AgroDesk).
2. У сотрудника заполнен `employees.telegram_id` (обычно через `/start` бота).

Без токена/telegram_id веб-мессенджер работает полностью; push просто не отправляется.

Deep-link в тексте: `{ALLOWED_ORIGINS[0]}/messenger/{chatId}`.

Код: `backend/app/services/telegram_notify.py`, `bot/app/services/messenger_notify.py` (аддитивно, без правок хендлеров смен).

## API (кратко)

- `GET /chats`, `GET /peers`, `GET /events`
- `POST /chats/direct`, `POST /chats/group` (admin)
- `PATCH /chats/{id}` (admin, group)
- `GET|POST /chats/{id}/messages`, `POST /chats/{id}/read`

## Нагрузочный локальный seed

```bash
# API на :8000
cd backend && python -m scripts.seed_messenger_load
```

## Тесты

```bash
cd backend && pytest tests/test_messenger_api.py tests/test_messenger_realtime.py -q
npm test -- --run src/features/messenger
npx playwright test e2e/messenger.spec.ts
```

Полный стек: см. `.github/workflows/full-suite.yml` и `npm run test:full` (локально).
