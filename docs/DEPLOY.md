# Деплой АгроДеск на VPS

> **Обновление прода (фронт / бэк / бот) — короткая шпаргалка:**  
> **[docs/PROD-UPDATE.md](PROD-UPDATE.md)** — обычный апдейт, точечные rebuild, bothost, чеклист.

**Единственный канал доставки:** репозиторий → GitHub (`main`) → зелёный CI → ручной `./deploy.sh` на VPS.  
Нет Object Storage / S3 / Yandex Cloud sync для фронта. Нет SSH-деплоя из GitHub Actions.

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

Скрипт: `git pull` → build → `up -d` (без удаления volumes) → проверка health → **`alembic upgrade head`** (обязательно) → `alembic current`.

Миграции также выполняются при старте контейнера `api` (`alembic upgrade head` в `docker-compose.yml`).  
Единственная точка доставки фронта и бэка — **эта VPS** (образ nginx + API).  
Отдельного Object Storage / S3 / Yandex Cloud канала **нет и не будет** без явного решения сменить архитектуру.

---

## CI (GitHub Actions) → ручной деплой на VPS

Порядок релиза:

```
локальная разработка → push / PR в main → зелёный CI → ssh на VPS → ./deploy.sh
```

CI **не** деплоит на прод и **не** ходит на VPS по SSH. Только проверки:

| Workflow | Когда | Что делает |
|----------|--------|------------|
| `.github/workflows/ci.yml` | push / PR в `main` | `npm ci` → oxlint → Vitest |
| `.github/workflows/backend.yml` | изменения в `backend/**` | Postgres 16 (service) → `alembic upgrade head` → seed → uvicorn → pytest |
| `.github/workflows/e2e.yml` | PR в `main` | Playwright `e2e/shifts.spec.ts` (отдельный CI Postgres) |

Перед `./deploy.sh` на VPS убедитесь, что в GitHub у коммита **зелёный** статус CI (lint + tests; backend — если меняли API).

Прод-миграции по-прежнему применяются на VPS при старте `api` / в `./deploy.sh`, не из GitHub Actions.

Секреты облачного деплоя (`YC_*`, bucket sync) и SSH auto-deploy из CI **не используются**.  
После зелёного CI оператор сам заходит на VPS и запускает `./deploy.sh`.

---

## Бэкап и восстановление

Локально на VPS (без облака). Каталог по умолчанию: `/opt/agrodesk/backups/`.

| Что | Бэкап | Восстановление | Ротация |
|-----|--------|----------------|---------|
| PostgreSQL | `./scripts/backup_db.sh` → `agrodesk_YYYYMMDD_HHMMSS.sql` | `./scripts/restore_db.sh` | 14 дней (`KEEP_DAYS`) |
| Uploads (фото) | `./scripts/backup_uploads.sh` → `uploads_YYYYMMDD_HHMMSS.tar.gz` | `./scripts/restore_uploads.sh` | 14 архивов (`KEEP_COUNT`) |

### Объём uploads и частота

```bash
docker exec agrodesk_api du -sh /app/uploads
docker exec agrodesk_api find /app/uploads -type f | wc -l
```

Ориентир: чек/фото ремонта обычно **0.2–2 МБ**. При небольшом приросте достаточно **ежедневного** бэкапа. Если каталог уже сотни МБ / ГБ — оставляйте суточный cron и копируйте архивы на второй носитель (`BACKUP_OFFSITE_TARGET`).

### Ночной cron (БД + uploads)

```bash
cd /opt/agrodesk
chmod +x scripts/*.sh
sudo ./scripts/install_backup_cron.sh
# или: 15 3 * * * /opt/agrodesk/scripts/run_nightly_backup.sh
tail -f /var/log/agrodesk-backup.log
```

Альтернатива — systemd timer: `scripts/systemd/agrodesk-backup.{service,timer}` → `enable --now agrodesk-backup.timer`.

### Второй носитель / удалённый хост (опционально)

В `.env.production` или environment unit/cron:

```bash
BACKUP_OFFSITE_TARGET=/mnt/usb-backups/agrodesk
# или: BACKUP_OFFSITE_TARGET=backup@192.168.1.50:/var/backups/agrodesk
# RSYNC_RSH="ssh -i /root/.ssh/agrodesk_backup"
```

Без переменной шаг `sync_backups_offsite.sh` пропускается.

### Восстановление БД

```bash
cd /opt/agrodesk
./scripts/restore_db.sh
./scripts/restore_db.sh backups/agrodesk_….sql
# подтверждение: YES
```

### Восстановление uploads

```bash
cd /opt/agrodesk
./scripts/restore_uploads.sh
./scripts/restore_uploads.sh backups/uploads_….tar.gz
# подтверждение: YES
docker compose --env-file .env.production restart api
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
