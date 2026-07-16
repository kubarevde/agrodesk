# Демо-пользователи AgroDesk

После `alembic upgrade head` и `python -m app.seed` (или автозапуска API) доступны учётки ниже.

> Если «Настройки → Добавить» отвечает «Не удалось добавить», сначала выполните  
> `cd backend && alembic upgrade head && python -m app.seed` и **полностью перезапустите** API  
> (`scripts/dev-backend.ps1` / `scripts/dev-backend.sh`). Проверка: `curl /api/health` → `db_up_to_date: true`  
> и `python scripts/smoke_settings.py`.

## Куда заходить

| Режим | Frontend | Backend |
|-------|----------|---------|
| **Dev** | http://localhost:5173 | http://localhost:8000 |
| **Prod (nginx)** | http://localhost/ | http://localhost/api/ |

Суперадмин-панель: `/superadmin/login`  
Вход сотрудников: `/login` (сначала выбор организации **Demo AgroDesk**)

---

## Суперадмин

| Поле | Значение |
|------|----------|
| URL | http://localhost:5173/superadmin/login |
| Email | `admin@agrodesk.local` |
| Пароль | `ChangeMe123!` |

Задаётся через `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` (создаётся при старте API, если таблица пуста).

---

## Организация Demo AgroDesk

| Поле | Значение |
|------|----------|
| Название | Demo AgroDesk |
| Slug | `demo` (или `main` на уже существующих БД) |
| Email владельца | `admin@demo.agrodesk` |

### Админ организации

| Поле | Значение |
|------|----------|
| Организация | Demo AgroDesk |
| Логин | `EMP000` **или** `admin@demo.agrodesk` |
| Пароль | `1234` |
| Роль | admin |

### Обычный сотрудник (для UI и Telegram-бота)

| Поле | Значение |
|------|----------|
| Организация | Demo AgroDesk |
| Логин | `EMP001` |
| Пароль | `1234` |
| Роль | employee |
| **telegram_id** | `111111111` |

В боте для теста используйте аккаунт Telegram с этим ID **или** временно подставьте свой `telegram_id` в карточке сотрудника.

Другие демо-сотрудники (пароль `1234`): `EMP002`, `EMP003` (manager), `EMP004`, `EMP005`.

Ставки: у EMP001 — базовая 250 ₽/ч (+ специфичная по виду работ); у EMP002 — базовая 300 ₽/ч через `employee_rates`.

---

## Организация «Тестовое хозяйство»

Вторая org для проверки изоляции данных.

| Поле | Значение |
|------|----------|
| Название | Тестовое хозяйство |
| Slug | `test-farm` |
| Логин | `EMP-TEST` |
| Пароль | `1234` |
| Роль | admin |

---

## Проверка бота

1. Backend: http://localhost:8000  
2. В `bot/.env`: `API_BASE_URL=http://localhost:8000`, тот же `BOT_INTERNAL_SECRET`, что у API.  
3. `SHEETS_MIRROR_ENABLED=false` — бот работает только с БД.  
4. Укажите реальный `telegram_id` у EMP001 или используйте тестовый `111111111`.
