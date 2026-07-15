# Telegram-бот АгроДеск

Каноническая реализация — **эта папка `bot/`**.

Папки `bot-main/` и копии — **legacy** (Sheets как источник правды). Не запускайте их.

## Как работает

1. Авторизация: `POST /api/auth/bot-token` (`telegram_id` + `BOT_INTERNAL_SECRET`).
2. Все чтения и записи смен — через `ApiClient` → PostgreSQL.
3. При `SHEETS_MIRROR_ENABLED=true` `DualWriter` дополнительно пишет/закрывает строку в Google Sheets.
4. Ошибки Sheets **не блокируют** бота.

## Env

```env
BOT_TOKEN=
API_BASE_URL=http://localhost:8000
BOT_INTERNAL_SECRET=agrodesk-bot-secret-change-me
SHEETS_MIRROR_ENABLED=false
GOOGLE_SHEETS_NAME=worktime_bot
GOOGLE_CREDS_PATH=credentials/service_account.json
```

## Демо сотрудник

См. [docs/seed-users.md](../docs/seed-users.md): `EMP001`, пароль `1234`, `telegram_id=111111111`.

## Запуск

```bash
cd bot
pip install -r requirements.txt
python bot.py
```
