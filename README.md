# АгроДеск v5.0

PWA + FastAPI + Telegram-бот для учёта работ в КФХ: мультитенантность, суперадмин, ставки оплаты, dual-write в Google Sheets (зеркало БД).

## Куда заходить

### Dev (рекомендуется)

| Сервис | URL |
|--------|-----|
| **Frontend (Vite)** | http://localhost:5173 |
| **Backend (FastAPI)** | http://localhost:8000 |
| API docs | http://localhost:8000/docs |
| Health | http://localhost:8000/health и http://localhost:8000/api/health |
| Вход | http://localhost:5173/login |
| Суперадмин | http://localhost:5173/superadmin/login |

### Prod (nginx)

| Сервис | URL |
|--------|-----|
| Frontend (лендинг + SPA) | http://localhost/ |
| API | http://localhost/api/ |
| Health через nginx | http://localhost/api/health |
| Суперадмин | http://localhost/superadmin/login |

Логины и пароли демо: [docs/seed-users.md](docs/seed-users.md).

---

## Быстрый старт (Dev)

Требования: Node.js 20+, Python 3.12+, PostgreSQL 16 (или Docker только для БД).

### 1. Backend + БД

```bash
# Вариант A: Postgres в Docker
docker compose up -d db api

# Вариант B: локальный Postgres
cd backend
cp .env.example .env   # DATABASE_URL, SECRET_KEY, SUPERADMIN_*
pip install -r requirements.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend: **http://localhost:8000**

### 2. Frontend

```bash
npm install
# .env.development уже содержит VITE_API_URL=http://localhost:8000
npm run dev
```

Frontend: **http://localhost:5173**

Vite проксирует `/api` → `:8000`, если нужно ходить relative (обычно достаточно `VITE_API_URL`).

### 3. Telegram-бот (опционально)

Канонический бот — папка `bot/` (не `bot-main/`).

```bash
cd bot
cp .env.example .env   # если есть; иначе создайте BOT_TOKEN, API_BASE_URL, BOT_INTERNAL_SECRET
# SHEETS_MIRROR_ENABLED=false  → только PostgreSQL
python bot.py
```

---

## Prod через Docker + nginx

```bash
docker compose --profile prod up --build
```

- Frontend: http://localhost/
- API через nginx: http://localhost/api/
- Прямой API: http://localhost:8000

Альтернатива: `uvicorn` на хосте + конфиг `nginx/agrodesk.conf` (proxy на `127.0.0.1:8000`).

Опционально Vite в Docker: `docker compose --profile frontend up` → http://localhost:5173

---

## Демо-вход

| Роль | Организация | Логин | Пароль |
|------|-------------|-------|--------|
| Суперадмин | — | `admin@agrodesk.local` | `ChangeMe123!` |
| Админ орг | Demo AgroDesk | `EMP000` или `admin@demo.agrodesk` | `1234` |
| Сотрудник | Demo AgroDesk | `EMP001` | `1234` |
| Telegram ID сотрудника | — | `111111111` | — |

Подробнее: [docs/seed-users.md](docs/seed-users.md).

---

## Архитектура кратко

- **Один источник правды по сменам** — PostgreSQL через API.
- **Google Sheets** — только зеркало (`DualWriter`), включается `SHEETS_MIRROR_ENABLED=true`.
- **Ставки** — `employee_rates` + `employees.hourly_rate` как fallback; расчёт в `salary.py`.
- **Мультитенантность** — `org_id` в JWT, `OrgContextMiddleware` на `/api/*`.

Структура:

```
backend/     FastAPI + Alembic
bot/         Telegram dual-write (канон)
src/         React SPA (TanStack Router)
nginx/       agrodesk.conf (host) / agrodesk.docker.conf (compose)
docs/        seed-users.md
```

Устаревшие копии бота (`bot-main/`) не используются — см. `bot/README.md`.

---

## E2E чеклист

См. [docs/e2e-checklist.md](docs/e2e-checklist.md).

Сборка фронта: `npm run build`.
