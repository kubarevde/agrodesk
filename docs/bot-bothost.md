# Telegram-бот АгроДеск — деплой на bothost.ru

Короткая схема:

```
Сотрудник → Telegram → Bot (bothost.ru) → HTTPS → AgroDesk API → PostgreSQL
```

Бот **не подключается к PostgreSQL**. Все данные — через REST API основного проекта.

---

## 1. Режим: polling (рекомендован)

| | Polling | Webhook |
|---|---------|---------|
| bothost.ru | ✅ Работает из коробки | Нужна настройка URL + код в боте |
| Исходящие запросы | Telegram + AgroDesk API | То же |
| Входящий порт | Не нужен | Нужен публичный HTTPS URL |
| Перезапуск | Автоматически переподключается | Нужно обновлять webhook |
| Нагрузка | Достаточно для учёта смен | Для высокой нагрузки |

**Выбор: polling** — проще деплой, не нужен входящий webhook, устойчивее при нестабильном Telegram в РФ.

`BOT_RUN_MODE=polling` (значение по умолчанию).

---

## 2. Env-переменные

### Обязательные

| Переменная | Альias | Пример | Описание |
|------------|--------|--------|----------|
| `BOT_TOKEN` | `BOTTOKEN` | от @BotFather | Токен Telegram-бота |
| `API_BASE_URL` | `APIBASEURL` | `https://agrodesk.example.ru` | **Публичный** URL API (не localhost) |
| `BOT_INTERNAL_SECRET` | `BOTINTERNALSECRET` | случайная строка 32+ символов | Общий секрет с backend |

### Рекомендуемые для bothost

| Переменная | Значение | Описание |
|------------|----------|----------|
| `AGRODESK_ENV` | `production` | Запрет дефолтного секрета и localhost URL |
| `BOT_RUN_MODE` | `polling` | Режим получения обновлений |
| `LOG_LEVEL` | `INFO` | Уровень логов |
| `REQUEST_TIMEOUT` | `15` | Таймаут HTTP к AgroDesk API (сек) |
| `REQUEST_RETRIES` | `2` | Повторы при сетевых ошибках API |
| `TELEGRAM_TIMEOUT` | `60` | Таймаут HTTP к Telegram API |
| `POLLING_TIMEOUT` | `30` | long-polling getUpdates (сек) |

### Опционально

| Переменная | Описание |
|------------|----------|
| `SMOKE_TELEGRAM_ID` | ID для `scripts/self_check.py` |
| `SHEETS_MIRROR_ENABLED` | `false` — зеркало Google Sheets (по умолчанию выкл.) |

Шаблоны: `bot/.env.example`, `bot/bot.env.example`.

**На backend** тот же `BOT_INTERNAL_SECRET` в `.env.production`.

---

## 3. Безопасность

1. **Секрет** — уникальный, только в env (не в Git). При `AGRODESK_ENV=production` бот не стартует с дефолтным секретом.
2. **`POST /api/auth/bot-token`** — требует `secret` + `telegram_id`; токен только для активного сотрудника с привязанным `telegram_id`; rate limit 30 req/min.
3. **HTTPS** — предпочтителен для `API_BASE_URL`. API на VPS должен быть доступен **извне** (nginx `:3010` или `:443`, не `127.0.0.1`).
4. **БД в боте** — не используется; credentials PostgreSQL на bothost не нужны.

Проверка доступности API с внешней машины:

```bash
curl -sf https://your-domain.ru/api/health
```

---

## 4. Деплой на bothost.ru (пошагово)

### Шаг 1. Подготовить репозиторий

Bothost ожидает `requirements.txt` и entrypoint в **корне репозитория**.

Вариант A — отдельный репозиторий (рекомендуется):

```
agrodesk-bot/          ← корень Git-репозитория для bothost
├── bot.py
├── main.py
├── requirements.txt
├── app/
│   └── ...
├── scripts/
│   └── self_check.py
└── README.md
```

Скопируйте **содержимое** папки `bot/` из монорепы в корень нового репо.

Вариант B — монорепа: укажите в bothost кастомный Dockerfile (`bot/Dockerfile`) и working directory.

### Шаг 2. Создать бота на bothost

1. [bothost.ru](https://bothost.ru) → создать бота
2. Платформа: **Telegram**
3. Библиотека: **Aiogram 3.x**
4. Git URL: ваш репозиторий
5. Ветка: `main`

### Шаг 3. Env в панели bothost

Скопируйте из `bot.env.example` и заполните:

```env
AGRODESK_ENV=production
BOT_TOKEN=<от BotFather>
API_BASE_URL=https://213.183.104.142:3010
BOT_INTERNAL_SECRET=<тот же что на VPS в .env.production>
BOT_RUN_MODE=polling
LOG_LEVEL=INFO
REQUEST_TIMEOUT=15
REQUEST_RETRIES=2
TELEGRAM_TIMEOUT=60
POLLING_TIMEOUT=30
```

> `API_BASE_URL` — URL, по которому bothost достаёт до API. Для VPS без домена: `http://IP:3010` (лучше позже перейти на HTTPS).

### Шаг 4. Entrypoint

| Параметр | Значение |
|----------|----------|
| Команда запуска | `python bot.py` |
| Главный файл | `bot.py` |

Bothost обычно определяет автоматически; при ручной настройке укажите `python bot.py`.

### Шаг 5. Self-check перед/после деплоя

Локально (из папки `bot/`):

```bash
pip install -r requirements.txt
export $(grep -v '^#' .env | xargs)   # или задайте env вручную
python scripts/self_check.py --telegram-id 111111111
```

На dev можно проверить смены:

```bash
python scripts/self_check.py --telegram-id 111111111 --with-shifts
```

### Шаг 6. Проверка после деплоя

1. **Логи bothost** — строки:
   - `Starting AgroDesk bot env=production`
   - `AgroDesk API health: OK 200`
   - `Long-polling started`
2. **Telegram** — `/start` от привязанного сотрудника
3. **Self-check** с вашей машины (если API доступен снаружи)

### Шаг 7. Отключить бот в docker-compose на VPS

Когда бот на bothost, в `docker-compose.yml` на VPS сервис `bot` можно не запускать:

```bash
docker compose --env-file .env.production up -d db api nginx
```

---

## 5. Привязка сотрудников

1. Сотрудник → `/start` → бот показывает Telegram ID
2. Менеджер → веб-панель → карточка сотрудника → поле Telegram ID → **Привязать**
3. Сотрудник → снова `/start` → меню по роли

Конфликт (ID уже занят) → HTTP 409 в веб-панели.

Демо после seed: `EMP001`, `telegram_id=111111111`.

---

## 6. Диагностика типовых ошибок

| Симптом | Причина | Решение |
|---------|---------|---------|
| `AgroDesk API unreachable` | Неверный URL / firewall / API down | `curl API_BASE_URL/api/health` с внешней сети |
| `BOT_INTERNAL_SECRET mismatch (403)` | Секреты не совпадают | Сверить env bothost и `.env.production` на VPS |
| `Telegram ID not linked (404)` | Нет привязки | Привязать в веб-панели |
| `BOT_TOKEN invalid` | Неверный токен | Проверить @BotFather |
| `Telegram API temporary error` | Сеть / блокировки | Бот переподключится сам; увеличить `TELEGRAM_TIMEOUT` |
| Бот молчит, API OK | Не привязан или polling упал | Логи bothost, `/start` |
| `default placeholder` при старте | Дефолтный секрет | Задать сильный `BOT_INTERNAL_SECRET` |

---

## 7. Smoke-сценарии

| Скрипт | Где | Что проверяет |
|--------|-----|---------------|
| `bot/scripts/self_check.py` | bothost / локально | env, Telegram getMe, API health, bot-token, /employees/me |
| `backend/scripts/smoke_bot_auth.py` | VPS / CI | link-telegram, bot-token, 403/404 |

---

## 8. Ограничения и риски

- **Один процесс polling** на токен — не запускайте бот одновременно на bothost и в docker-compose.
- **FSM в памяти** — при рестарте незавершённые диалоги сбрасываются.
- **HTTP без TLS** — работает, но трафик bot↔API не шифруется; для prod желателен HTTPS.
- **Rate limit bot-token** — 30 попыток/мин с IP; при массовых тестах возможен 429.
- **bothost free tier** — «спящий режим»; для 24/7 нужен платный тариф.
- **Webhook** — не реализован; при необходимости — отдельная задача.

---

## 9. Почему бот не ходит в БД напрямую

- Единая бизнес-логика на backend (смены, роли, расчёт часов)
- Безопасность: бот не получает `DATABASE_URL`
- Независимый деплой: bothost не нужен PostgreSQL
- Изменения из бота сразу видны в веб-приложении
