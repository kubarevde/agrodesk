# Диагностика: бот отвечает «Нет связи с API» / не открывает смену

Дата среза: 2026-07-29.  
Контекст: `bot/` (aiogram 3) → `POST /api/auth/bot-token` → `/api/shifts`.  
Compose: `db` + `api` + `bot` + `nginx`. Альтернатива: бот на bothost.ru.

> С этой рабочей станции **нет Docker и нет SSH на VPS**.  
> Ниже — результаты внешних проверок + чеклист команд для запуска **на VPS** (`/opt/agrodesk`).

---

## 1. Health-эндпоинт

В коде уже есть (добавлять не нужно):

| URL | Назначение |
|-----|------------|
| `GET /health` | Docker healthcheck api |
| `GET /api/health` | Бот (`ApiClient.health_check`) и nginx |

**Внешняя проверка (с ПК, 2026-07-29):**

```text
http://213.183.104.142:3010/api/health → 200
{"status":"ok","version":"5.0.0","db_revision":"026_inventory_stock_repair",
 "code_head":"026_inventory_stock_repair","db_up_to_date":true}

http://213.183.104.142:8000/api/health → 200 (тот же payload)
```

Вывод: **API снаружи доступен**, nginx проксирует `/api/` нормально.  
Важно: на проде **`code_head` = 026** — образ API **устарел** относительно репо (head локально `028_support_tickets`). На смены это не обязано ломать бота, но деплой пора обновить (`./deploy.sh`).

---

## 2. Как бот должен ходить в API

| Где крутится бот | `API_BASE_URL` | Комментарий |
|------------------|----------------|-------------|
| Контейнер `agrodesk_bot` на VPS | `http://api:8000` | Внутренняя Docker-сеть, **минуя nginx** |
| bothost.ru | `http://213.183.104.142:3010` (или HTTPS-домен) | Публичный URL; **`http://api:8000` с bothost НЕ работает** |

Compose (после правки): `API_BASE_URL: ${BOT_API_BASE_URL:-http://api:8000}`,  
`BOT_INTERNAL_SECRET` обязателен (`:?`).

Секрет должен **байт-в-байт** совпадать с `BOT_INTERNAL_SECRET` у `api` (`.env.production`).

Шаблоны: `bot/.env.example`, `.env.production.example`.

---

## 3–4. Логи (на VPS)

```bash
cd /opt/agrodesk
./scripts/diagnose_bot_api.sh
# или вручную:
docker compose exec bot curl -sf http://api:8000/api/health
docker logs --tail=200 agrodesk_bot
docker logs --tail=200 agrodesk_api | grep -E 'bot-token|/api/shifts|403|500'
```

Типичные сигналы в логах бота:

| Лог | Смысл | Сообщение пользователю |
|-----|--------|-------------------------|
| `bot-token network error` / `ConnectError` | Нет сети / неверный URL | «Не удалось связаться…» / теперь «Нет связи с API» |
| `bot-token forbidden` / 403 | Секрет не совпал | «Ошибка конфигурации бота (секрет…)» |
| `404` на bot-token | Telegram ID не привязан | «Вы не привязаны…» |
| `open_shift status=4xx` | API доступен, отказ бизнес-логики | после фикса — «связь есть, сервер отклонил» |

---

## 5. Telegram token и двойной polling

Из `docs/PROD-UPDATE.md`: **один** polling на один `BOT_TOKEN`.

Нельзя одновременно:

- `agrodesk_bot` в Compose **и**
- бот на bothost с тем же токеном.

Проверка:

```bash
docker ps | grep bot
# + панель bothost: бот не должен быть «Running», если используете VPS-контейнер
```

`getMe` (на VPS / bothost):

```bash
docker exec agrodesk_bot python -c "import os,urllib.request; t=os.environ['BOT_TOKEN']; print(urllib.request.urlopen(f'https://api.telegram.org/bot{t}/getMe').read())"
```

---

## 6. Legacy `bot-main/`

В монорепе **нет** `bot-main/` (см. `docs/legacy-bots.md`). Используйте только `bot/`.

---

## 7. Nginx

`nginx/agrodesk.docker.conf`: `/api/` → `http://api:8000`.  
Контейнерный бот **не обязан** ходить через nginx; прямой `http://api:8000` — правильный путь. Nginx внутренние запросы bot→api **не блокирует**.

---

## Наиболее вероятные причины «Нет связи / Проверьте API»

1. **Бот на bothost с `API_BASE_URL=http://api:8000`** — hostname `api` существует только внутри Compose → connection refused / unreachable.  
   **Фикс:** `API_BASE_URL=http://213.183.104.142:3010` + Redeploy; либо перенести бота в Compose.
2. **Пустой / разный `BOT_INTERNAL_SECRET`** у bot и api → 403 (в UI это не «нет связи», а «секрет»).  
   **Фикс:** один секрет в `.env.production`, пересоздать `api`+`bot` (или bothost Redeploy).
3. **Два polling** → бот «молчит» или ведёт себя странно; отдельно проверить API.  
4. **Устаревший деплой API (revision 026)** — обновить VPS; не первопричина health, но риск рассинхрона.
5. **Смена отклонена API** при живом health — раньше текст был «Проверьте API» (вводил в заблуждение).

---

## Что исправлено в репозитории (точечно)

1. `bot/Dockerfile` — установлен `curl` для `docker exec … curl http://api:8000/api/health`.
2. `docker-compose.yml` — `BOT_INTERNAL_SECRET` обязателен; `API_BASE_URL` через `BOT_API_BASE_URL` с дефолтом `http://api:8000`.
3. `bot/app/handlers/work_start.py` — при неудачном `open_shift` сначала `health_check`: явное **«Нет связи с API»** vs **«связь есть, сервер отклонил»**.
4. `scripts/diagnose_bot_api.sh` — однокомандная диагностика на VPS.

Модель/рефакторинг бота не делались.

---

## Как проверить фикс на проде

```bash
# на VPS
cd /opt/agrodesk
git pull --ff-only
./deploy.sh          # или точечно: build bot api && up -d
./scripts/diagnose_bot_api.sh

# ожидание:
# - curl из bot → {"status":"ok",...}
# - в логах bot нет ConnectError к api
# - alembic/code_head соответствуют актуальному репо после полного deploy
```

В Telegram (тестовый сотрудник с привязанным `telegram_id`):

1. `/start` — имя/меню, не ошибка секрета/сети.  
2. «🟢 Начал работу» → объект → тип работ → смена открыта.  
3. Если снова ошибка — текст теперь скажет, **связь** это или **отказ API**; смотреть `docker logs agrodesk_api` на `POST /api/shifts`.

Если бот на bothost — после смены `API_BASE_URL` на публичный URL сделать Redeploy и **остановить** `agrodesk_bot` на VPS:

```bash
docker compose --env-file .env.production stop bot
```
