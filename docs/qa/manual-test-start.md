# Старт ручного тестирования AgroDesk

Связанный отчёт: [pre-manual-test-report.md](./pre-manual-test-report.md)

**Статус стенда: ГОТОВО К ПОЛНОМУ РУЧНОМУ ТЕСТИРОВАНИЮ** (прогон 2026-08-11).

## URL стенда (обязательный QA)

| Сервис | URL |
|--------|-----|
| Frontend | http://localhost:5173 |
| QA Backend | http://127.0.0.1:8001 |
| Health | http://127.0.0.1:8001/api/health |
| API docs | http://127.0.0.1:8001/docs |

> Playwright и локальный QA ожидают `VITE_API_PROXY_TARGET=http://127.0.0.1:8001`.  
> **Не** использовать API на `:8000`, если он смотрит в локальную `agrodesk` (часто revision `029`).

## Как поднять QA-среду

```powershell
# 1) Чистая БД + миграции
python scripts/qa_prepare_db.py

# 2) Seed
python scripts/qa_seed.py

# 3) API
$env:DATABASE_URL = "postgresql+asyncpg://USER:PASS@localhost:5432/agrodesk_qa"
$env:RUN_SEED_ON_START = "false"
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

# 4) Frontend (второй терминал)
cd ..
$env:VITE_API_PROXY_TARGET = "http://127.0.0.1:8001"
npm run dev
```

Проверка health:

- `status: ok`
- `db_up_to_date: true`
- `db_revision` = `078_repair_tasks_section_grants` (= `code_head`)

## Учётные записи (после seed)

Организация: **Demo AgroDesk** (`slug`: `main`)

| Роль | Логин | Пароль |
|------|-------|--------|
| Admin | EMP000 | 1234 |
| Employee | EMP001 / EMP002 / … | 1234 |
| Manager | EMP003 | 1234 |

Суперадмин: `admin@agrodesk.local` / из `.env` (example: `ChangeMe123!`).

Подробнее: [docs/seed-users.md](../seed-users.md).

## Автопроверки перед ручным стартом

```powershell
npx tsc -b
npm run build
npm run lint
npm test
$env:API_BASE_URL = "http://127.0.0.1:8001"
$env:DATABASE_URL = "postgresql+asyncpg://USER:PASS@localhost:5432/agrodesk_qa"
cd backend; pytest tests/ -q; cd ..
$env:CI = "1"
$env:VITE_API_PROXY_TARGET = "http://127.0.0.1:8001"
npm run test:e2e
```

Ожидание: все команды PASS (см. отчёт).

## С чего начать ручной тест

1. **Health + login** EMP000 → Dashboard (форма входа: Demo AgroDesk → Продолжить → EMP000/1234).
2. **Рабочее место** `/workspace` — вкладки: Моя смена / Задачи / Мои заявки ТМЦ / Мессенджер; `/my-shift`, `/tasks`, `/messenger` редиректят.
3. **Поля → посев (культура+сорт) → контур** внутри поля; пересечения 422; поле без культуры на create.
4. **Шеринг** — полное поле vs часть поля.
5. **ТМЦ** — архив/удаление; категории через Select.
6. **Оплата труда** — база 50 000 → премия +5 000 → аванс 10 000 → confirm Expense «Зарплата» 55 000 → выдача остатка 45 000 → статус «Выдано».
7. **Mobile** 320 / 375 / 390 / 768 / 1024 / 1440 — workspace, payroll, dashboard map fullscreen.
8. **Права** admin / manager / employee (после 078 manager снова имеет дефолтные секции + tasks).

## Что не делать

- Не тестировать на production.
- Не накатывать миграции на рабочую `agrodesk` без бэкапа и подтверждения.
- Не использовать `agrodesk` revision 029 для проверки нового кода.
- Не «чинить» падения skip/xfail/отключением тестов.

## Как вернуть среду

```powershell
python scripts/qa_prepare_db.py
python scripts/qa_seed.py
# перезапустить API :8001 и Vite с proxy :8001
```
