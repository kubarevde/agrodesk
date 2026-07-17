# Деплой АгроДеск на VPS

> **Обновление прода (фронт / бэк / бот) — короткая шпаргалка:**  
> **[docs/PROD-UPDATE.md](PROD-UPDATE.md)** — обычный апдейт, точечные rebuild, bothost, чеклист.

Целевой сервер: **http://213.183.104.142:3010**  
Стек: Docker Compose — `db` (PostgreSQL 16), `api` (FastAPI), `bot` (Telegram), `nginx` (фронт + proxy `/api`).

---

## Требования

На сервере Ubuntu 22.04+:

- Docker Engine 24+
- Docker Compose plugin (`docker compose version`)
- git
- открытый порт **3010/tcp** (и опционально 8000 для отладки API)

Установка Docker (кратко):

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# перелогиньтесь, затем:
docker compose version
```

---

## Первый деплой

### 1. Клонирование

```bash
sudo mkdir -p /opt/agrodesk
sudo chown "$USER":"$USER" /opt/agrodesk
cd /opt/agrodesk
git clone <URL_РЕПОЗИТОРИЯ> .
# или: git pull, если уже склонировано
```

### 2. Файл окружения

```bash
cp .env.production.example .env.production
nano .env.production   # задайте секреты!
```

Обязательно смените:

| Переменная | Назначение |
|------------|------------|
| `SECRET_KEY` | Подпись JWT |
| `BOT_INTERNAL_SECRET` | Общий секрет бот ↔ API |
| `BOT_TOKEN` / `TELEGRAM_BOT_TOKEN` | Токен Telegram-бота |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Первый суперадмин |

`DATABASE_URL` **не** задаётся вручную — Compose собирает  
`postgresql+asyncpg://USER:PASS@db:5432/DB` (нужен драйвер `asyncpg`).

### 3. Запуск

```bash
chmod +x deploy.sh scripts/*.sh
./deploy.sh
```

Эквивалент вручную:

```bash
docker compose --env-file .env.production up -d --build
```

При старте API выполняет `alembic upgrade head` (без удаления данных), затем uvicorn.

### 4. Проверка

```bash
docker compose --env-file .env.production ps
curl -sf http://127.0.0.1:8000/health
curl -sf http://127.0.0.1:3010/api/health
docker exec agrodesk_api alembic current
docker compose --env-file .env.production logs -f --tail=100
```

В браузере:

- UI: http://213.183.104.142:3010  
- Health: http://213.183.104.142:3010/api/health  
- Суперадмин: http://213.183.104.142:3010/superadmin/login  

### Telegram-бот на bothost.ru (отдельно от VPS)

Бот можно вынести на [bothost.ru](https://bothost.ru) и оставить на VPS только `db`, `api`, `nginx`.
Подробно: **[docs/bot-bothost.md](bot-bothost.md)**.

Кратко:

1. `API_BASE_URL` на bothost = публичный URL API (`http://213.183.104.142:3010` или HTTPS-домен).
2. `BOT_INTERNAL_SECRET` — тот же, что в `.env.production` на VPS.
3. Убедитесь, что `curl http://213.183.104.142:3010/api/health` работает **с внешней сети** (не только с localhost).
4. Не запускайте сервис `bot` в docker-compose одновременно с bothost (один токен = один polling).

```bash
# VPS без локального бота:
docker compose --env-file .env.production up -d db api nginx
```

---

## Обновление (релизы)

Данные в volumes `postgres_data` и `uploads_data` **сохраняются**.  
Никогда не запускайте `docker compose down -v` на проде.

```bash
cd /opt/agrodesk
./deploy.sh
```

Скрипт: `git pull` → build → `up -d` (без удаления volumes) → проверка health → `alembic current`.

Миграции применяются автоматически при каждом старте API-контейнера.
Актуальные ревизии включают `016_audit_log` (журнал «История изменений»).

---

## Бэкап и восстановление

### Бэкап

```bash
./scripts/backup_db.sh
# файлы → ./backups/agrodesk_YYYYMMDD_HHMMSS.sql
```

Cron (ежедневно в 03:15):

```bash
crontab -e
# добавьте:
15 3 * * * cd /opt/agrodesk && ./scripts/backup_db.sh >> /var/log/agrodesk-backup.log 2>&1
```

Хранение: **14 дней** (ротация в скрипте).

### Восстановление

```bash
./scripts/restore_db.sh                  # последний дамп
./scripts/restore_db.sh backups/agrodesk_....sql
# подтверждение: YES
```

---

## Полезные команды

```bash
# Логи
docker logs -f agrodesk_api
docker logs -f agrodesk_bot
docker logs -f agrodesk_nginx

# Shell в API
docker exec -it agrodesk_api bash

# Перезапуск одного сервиса
docker compose --env-file .env.production restart api

# Остановка без удаления данных
docker compose --env-file .env.production down
```

---

## Архитектура сети

```
Internet → :3010 nginx
              ├─ /           → статика (SPA)
              ├─ /api/       → api:8000
              ├─ /uploads/   → api:8000
              └─ /superadmin/api/ → api:8000

bot → http://api:8000  (внутренняя Docker-сеть)
api → db:5432
```

Volumes:

| Volume | Путь в контейнере | Содержимое |
|--------|-------------------|------------|
| `postgres_data` | `/var/lib/postgresql/data` | БД |
| `uploads_data` | `/app/uploads` | Загруженные фото |

PostgreSQL с хоста доступен только на `127.0.0.1:5432` (не в публичный интернет).

---

## Troubleshooting

| Симптом | Что проверить |
|---------|----------------|
| nginx up, белый экран | `docker logs agrodesk_nginx`; пересоберите frontend |
| `/api/health` 502 | `docker logs agrodesk_api`; дождитесь healthcheck |
| bot restart loop | `BOT_TOKEN` в `.env.production` |
| alembic ошибка | `docker exec agrodesk_api alembic history` |
| нет фото после реконтейнеризации | volume `uploads_data` не должен удаляться (`down -v` запрещён) |

Graceful shutdown API: uvicorn ловит SIGTERM; lifespan освобождает connection pool (`engine.dispose()`).
