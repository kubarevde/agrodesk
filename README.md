# АгроДеск v5.0

PWA + FastAPI + Telegram-бот для учёта работ в КФХ: мультитенантность, суперадмин, ставки оплаты, dual-write в Google Sheets (зеркало БД).

## Куда заходить

### Dev

| Сервис | URL |
|--------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Backend (FastAPI) | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health · `/api/health` |
| Вход | http://localhost:5173/login |
| Суперадмин | http://localhost:5173/superadmin/login |

### Prod (nginx)

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost/ |
| API | http://localhost/api/ |
| Суперадмин | http://localhost/superadmin/login |

Демо-логины: [docs/seed-users.md](docs/seed-users.md).

---

## Первый запуск (Dev)

```bash
# БД + API (Docker) или локальный Postgres
docker compose up -d db api
# либо:
cd backend
cp .env.example .env
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd ..
npm install
npm run dev
```

При старте API:
1. Создаётся суперадмин из `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` (если таблица пуста).
2. При `RUN_SEED_ON_START=true` — demo org, сотрудники, справочники.

Ручной seed суперадмина: `POST /superadmin/api/seed-superadmin`.

Backfill зарплаты для старых смен:

```bash
cd backend
PYTHONPATH=. python scripts/backfill_shift_salary.py
```

---

## Переменные окружения

### Backend (`backend/.env`)

| Переменная | Описание |
|------------|----------|
| `DATABASE_URL` | `postgresql+asyncpg://...` |
| `SECRET_KEY` | JWT signing |
| `JWT_EXPIRE_MINUTES` | TTL access-токена (по умолчанию 10080 = 7 дней) |
| `LOG_LEVEL` | `INFO` / `DEBUG` / … |
| `BOT_INTERNAL_SECRET` | Секрет бота → `/api/auth/bot-token` |
| `TELEGRAM_BOT_TOKEN` | Уведомления (опционально) |
| `ALLOWED_ORIGINS` | CORS CSV |
| `API_URL` | Публичный URL API |
| `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` | Bootstrap суперадмина |
| `RUN_SEED_ON_START` | `true` — demo seed на старте |
| `UPLOADS_DIR` | Каталог загрузок |

`ORG_ID` — опционально для smoke-скриптов (`scripts/smoke_*.py`); иначе берётся первая орг из `/api/auth/orgs`.

### Frontend (`.env.development`)

| Переменная | Описание |
|------------|----------|
| `VITE_API_URL` | `http://localhost:8000` |
| `VITE_USE_MOCKS` | `false` |
| `VITE_APP_NAME` | АгроДеск |

### Bot (`bot/.env`)

| Переменная | Описание |
|------------|----------|
| `BOT_TOKEN` | Telegram |
| `API_BASE_URL` | `http://localhost:8000` |
| `BOT_INTERNAL_SECRET` | Как у API |
| `SHEETS_MIRROR_ENABLED` | `false` по умолчанию |

---

## Деплой (production)

Подробный мануал: **[docs/DEPLOY.md](docs/DEPLOY.md)**  
Прод: http://213.183.104.142:3010

```bash
cp .env.production.example .env.production   # заполните секреты
chmod +x deploy.sh scripts/*.sh
./deploy.sh

# Бэкап / восстановление БД
./scripts/backup_db.sh
./scripts/restore_db.sh
```

Compose: PostgreSQL + API (+ alembic) + Telegram-бот + Nginx (порт **3010**).  
Volumes: `postgres_data`, `uploads_data` — данные живут между пересборками.

---

## Проверки

```bash
cd backend
PYTHONPATH=. python scripts/audit_api.py
PYTHONPATH=. python scripts/smoke_salary.py
PYTHONPATH=. python scripts/smoke_bot_auth.py
pytest tests/ -q   # API должен быть запущен
```

Frontend: `npm run build`.

E2E checklist: [docs/e2e-checklist.md](docs/e2e-checklist.md).

---

## Архитектура

- Источник правды по сменам — PostgreSQL.
- Sheets — только зеркало (`DualWriter`), `SHEETS_MIRROR_ENABLED=false` → только БД.
- Ставки — `employee_rates` + `hourly_rate` fallback; расчёт в `salary.py`.
- Мультитенантность — `org_id` в JWT и на основных сущностях (inventory/expenses/shipments/implements/sharing_listings и справочники).
- Access JWT TTL — `JWT_EXPIRE_MINUTES` (refresh-токен пока не реализован).
