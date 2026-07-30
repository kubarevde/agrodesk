# Telegram-бот АгроДеск

Автономный Python-сервис (aiogram 3). Legacy `bot-main/` не использовать.

```
Telegram → Bot → HTTPS/HTTP → AgroDesk API → PostgreSQL
```

Полная инструкция: **[docs/bot-bothost.md](../docs/bot-bothost.md)**  
Диагностика «не открывается смена»: **[docs/bot-api-diagnostics.md](../docs/bot-api-diagnostics.md)**

## Быстрый старт (локально)

1. Поднимите API (`uvicorn` на `:8000`, seed включён).
2. В `bot/.env` (см. `.env.example`):

```env
BOT_TOKEN=<от BotFather>
API_BASE_URL=http://localhost:8000
BOT_INTERNAL_SECRET=agrodesk-bot-secret-change-me
AGRODESK_ENV=development
LOG_LEVEL=DEBUG
SHEETS_MIRROR_ENABLED=false
```

`BOT_INTERNAL_SECRET` должен **совпадать** с `backend/.env`.

3. Проверка связи и смены (демо EMP001, `telegram_id=111111111`):

```bash
cd bot
pip install -r requirements.txt
pip install pytest pytest-asyncio
python scripts/self_check.py --telegram-id 111111111 --with-shifts
python -m pytest tests -q
python bot.py
```

В Telegram: `/start` → «🟢 Начал работу» → объект → гео → тип работ → (поле) → техника → комментарий.

## Env (обязательные)

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Токен @BotFather |
| `API_BASE_URL` | URL API (`http://localhost:8000` локально; публичный URL на bothost) |
| `BOT_INTERNAL_SECRET` | Общий секрет с backend |

На bothost: `AGRODESK_ENV=production`, `BOT_RUN_MODE=polling`.

## Что умеет бот (как /my-shift)

| Действие | Кнопка |
|----------|--------|
| Открыть смену | 🟢 Начал работу |
| Закрыть смену | 🔴 Закончил работу (описание ≥ 5 символов) |
| Текущая смена | 📊 Мой статус |
| Смены за день | 📅 Сегодня |

Контракт API: `POST /api/auth/bot-token` → `POST /api/shifts` / `POST /api/shifts/{id}/close` (без изменений backend).

## Ограничения

- Бот **только online** — офлайн-очередь есть в веб-PWA, не в Telegram.
- Один polling на `BOT_TOKEN` (не крутите Compose-бота и bothost одновременно).
- Полевая работа требует выбор поля (как в веб).
