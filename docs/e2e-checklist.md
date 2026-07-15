# E2E чеклист — АгроДеск v5.0

## Адреса

- [ ] Dev: backend http://localhost:8000, frontend http://localhost:5173
- [ ] Prod: frontend http://localhost/, API http://localhost/api/
- [ ] `curl http://localhost:8000/health` → `{"status":"ok",...}`
- [ ] `curl http://localhost:8000/api/health` → ok
- [ ] `curl http://localhost/` → 200 (prod nginx)

## Лендинг

- [ ] `/` → без авторизации, все секции
- [ ] «Войти» / «Попробовать» → `/login`
- [ ] Mobile: hamburger, adaptive

## Вход с организацией

- [ ] `GET /api/auth/orgs` → активные орги
- [ ] `/login` → орг → email/пароль → dashboard / my-shift
- [ ] Сотрудник орг1 + org_id орг2 → 401
- [ ] Заблокированная орг не в списке

## Суперадмин

- [ ] Startup / `SUPERADMIN_*` создаёт суперадмина
- [ ] `/superadmin/login` → dashboard
- [ ] Создать орг → temp_password
- [ ] Блок орг → вход сотрудников запрещён
- [ ] Dashboard без токена → login

## Мультитенантность

- [ ] Данные изолированы по `org_id`
- [ ] `GET /api/employees` — только своя орг

## Оплата

- [ ] Ставка + preview + сохранение
- [ ] Закрытие смены → `calculated_amount`
- [ ] `POST /api/reports/salary` → xlsx 3 листа
- [ ] `/employees` → Расчёт ЗП → Excel

## Telegram-бот

- [ ] 🟢 Начал → PostgreSQL (+ Sheets если mirror on)
- [ ] 🔴 Закончил → закрытие в БД (+ Sheets)
- [ ] `SHEETS_MIRROR_ENABLED=false` → только БД, без ошибок
- [ ] Справочники из API, не хардкод

## FAQ

- [ ] Справка есть на: вход, дашборд, сотрудники/ставки, расчёт ЗП, мои смены, суперадмин
