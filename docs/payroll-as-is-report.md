# Оплата труда в АгроДеск — фактическое AS-IS описание

Дата обследования: 2026-08-10  
Режим: только чтение кода, без изменений.

---

## 1. Модель данных

### 1.1. Таблица `employee_rates`

**Модель:** `backend/app/models/employee_rate.py`  
**Миграция создания:** `backend/alembic/versions/009_employee_rates.py` (`revision = 009_employee_rates`)  
**Миграция multi-org:** `backend/alembic/versions/010_multi_org.py` — добавляет `org_id`

| Поле | Тип (модель) | Nullable | FK / примечание |
|------|--------------|----------|-----------------|
| `id` | UUID PK | нет | — |
| `org_id` | UUID | нет (в модели) | `organizations.id` |
| `employee_id` | UUID | нет | `employees.id` |
| `work_type_id` | UUID | **да** | `work_types.id`; `NULL` = базовая ставка сотрудника в этой таблице |
| `rate` | Numeric(10,2) | нет | ₽/час; в DDL: `CHECK (rate >= 0)` |
| `overtime_multiplier` | Numeric(4,2) | нет, default 1.0 | множитель сверхурочных |
| `overtime_threshold_hours` | Numeric(4,1) | нет, default 8.0 | порог часов до сверхурочных |
| `valid_from` | Date | нет, default current_date | начало действия |
| `valid_to` | Date | **да** | конец действия; `NULL` = бессрочно |
| `notes` | Text | да | — |
| `created_by` | UUID | да | `employees.id` |
| `created_at` | DateTime(tz) | нет | — |

**История ставок:** да. Несколько строк на сотрудника; выборка по дате смены:  
`valid_from <= shift_date` и (`valid_to IS NULL` или `valid_to >= shift_date`), берётся запись с наибольшим `valid_from`.

**Уникальность (миграция 009):** частичный уникальный индекс  
`uq_employee_rate_period ON (employee_id, work_type_id, valid_from) WHERE valid_to IS NULL`  
— не более одной «открытой» ставки на пару сотрудник × вид работы (или база при `work_type_id IS NULL`).

**Замечание по `org_id`:** в SQL миграции `010` колонка добавлена как nullable и backfill в org `main`; в SQLAlchemy-модели — `nullable=False`. Отдельного `SET NOT NULL` именно для `employee_rates` в обследованных миграциях **не найдено**.

### 1.2. Поле на сотруднике (legacy fallback)

**Модель:** `backend/app/models/employee.py` — поле `hourly_rate` (`Numeric(10,2)`, default 0)  
**Начальная схема:** `backend/alembic/versions/ca84ef64c25e_initial_schema.py`

Это отдельное поле карточки сотрудника, не строка в `employee_rates`. Используется только если в `employee_rates` нет применимой строки (см. §2).

### 1.3. Поля на смене (снимок расчёта)

**Модель:** `backend/app/models/shift.py`  
Добавлены в `009_employee_rates.py`:

| Поле | Тип | Назначение |
|------|-----|------------|
| `calculated_amount` | Numeric(10,2), nullable | итоговая сумма оплаты за закрытую смену |
| `rate_snapshot` | JSONB, nullable | разбивка расчёта + `source` |

У смены есть `work_type_id` и (опционально) `agro_plan_id`. **`agro_plan_id` в выборе ставки не участвует** (`backend/app/services/salary.py`).

### 1.4. Связь ставки с видом работы

Да, через опциональный FK `employee_rates.work_type_id → work_types.id`.

Механизм: **таблица «сотрудник × (опционально вид работы) × ставка × период»**, не отдельная M:N-матрица и не ставки на `agro_plan`.

Семантика `work_type_id`:
- **не NULL** — ставка по конкретному виду работы (`source = work_type_specific`);
- **NULL** — «базовая» ставка в системе rates (`source = employee_base`).

Ставок на уровне справочника `work_types` (колонок ставки на виде работы) **не найдено**.

### 1.5. Тип схемы оплаты (почасовая / посменная / оклад)

**Не найдено** в БД и моделях: нет enum/колонки `pay_type`, `payment_scheme`, `salary_type`, полей оклада, подённой или сдельной ставки.

Фактически **жёстко почасовая** логика: `rate` всегда трактуется как ₽/час; сверхурочные — через `overtime_threshold_hours` и `overtime_multiplier`.

Строковые метки источника ставки (не схема оплаты):  
`work_type_specific` | `employee_base` | `fallback_hourly_rate`  
(`SOURCE_LABELS` в `backend/app/services/salary.py`).

Категория затрат `salary` / «Зарплата» в словаре расходов — **ярлык категории Expense**, не схема начисления ЗП.

---

## 2. Логика расчёта

### 2.1. Где считается

**Сервис:** `backend/app/services/salary.py`

| Функция | Назначение |
|---------|------------|
| `get_rate_for_shift` | выбор ставки и `source` |
| `calculate_amount` | формула часов × ставка (+ сверхурочные) |
| `apply_salary_to_shift` | запись `calculated_amount` + `rate_snapshot` на смену |
| `shift_pay_amount` | чтение суммы (снимок или упрощённый fallback) |
| `shift_source_label` / `source_label` | русские подписи источника |

**Точки вызова при закрытии/записи смены:** `backend/app/routers/shifts.py` (создание закрытой смены, close, update при изменении закрытой смены/времени).  
**Скрипт бэкфилла:** `backend/scripts/backfill_shift_salary.py`.

Округление длительности смены (вход для часов):  
`backend/app/services/shifts.py` → `calc_duration_rounded`:  
`ceil(duration_raw_minutes / 30) * 0.5` → часы в `shift.duration_rounded`.

### 2.2. Формула по шагам

1. **Часы** = `float(shift.duration_rounded or 0)`.
2. **Выбор ставки** (`get_rate_for_shift`), приоритет:
   1. `EmployeeRate` с тем же `employee_id` + `work_type_id` смены, активная на `shift.date` → `work_type_specific`;
   2. иначе `EmployeeRate` с `work_type_id IS NULL`, активная на дату → `employee_base`;
   3. иначе объект ставки `None`, `source = fallback_hourly_rate`.
3. **Fallback-число** = `float(employee.hourly_rate or 0)`.
4. **`calculate_amount(hours, rate_obj, fallback_rate)`:**
   - `rate` = `rate_obj.rate` или `fallback_rate`;
   - `threshold` = `rate_obj.overtime_threshold_hours` или **8.0**;
   - `multiplier` = `rate_obj.overtime_multiplier` или **1.0**;
   - `regular_h = min(hours, threshold)`;
   - `overtime_h = max(0, hours − threshold)`;
   - `regular_sum = round(regular_h * rate, 2)`;
   - `overtime_sum = round(overtime_h * rate * multiplier, 2)`;
   - `total = round(regular_sum + overtime_sum, 2)`.
5. На смену пишется `calculated_amount = total` и `rate_snapshot = {…breakdown, source}`.

**Не найдено:** расчёт от числа дней, фиксированного оклада, сдельной оплаты, ставки «за смену» как фиксированной суммы.

### 2.3. «Базовая ставка (fallback)» — как в коде

В коде **нет** строки UI «Базовая ставка (fallback)». Есть **два разных «базовых» уровня**:

| Уровень | Где хранится | `source` в snapshot | Подпись в отчёте |
|---------|--------------|---------------------|------------------|
| База в `employee_rates` | строка с `work_type_id IS NULL` | `employee_base` | «Базовая» |
| Legacy на сотруднике | `employees.hourly_rate` | `fallback_hourly_rate` | «Старый тариф» |

`employees.hourly_rate` применяется **только** когда ни одна подходящая строка `employee_rates` (ни по виду работ, ни базовая с `work_type_id IS NULL`) не найдена на дату смены.

Если найден `rate_obj`, но у него `rate` странно `NULL` (защита в коде), число ставки берётся из `fallback_rate` (`employees.hourly_rate`), при этом `source` всё равно остаётся от выбранного объекта.

`shift_pay_amount` без `calculated_amount`: упрощённо `hours * employee.hourly_rate` (без overtime-логики rates).

---

## 3. Отчётность

### 3.1. Preview и Excel

| Эндпоинт | Сервис | Период | Разрез |
|----------|--------|--------|--------|
| `GET /api/reports/salary-preview?month=YYYY-MM` | `build_salary_preview` в `backend/app/services/reports.py` | календарный месяц | **summary** по сотруднику (смены, часы, regular/overtime, amount); **shifts** — по дням/сменам (дата, сотрудник, вид работ, часы, amount, source); `totalAmount` |
| `POST /api/reports/salary` body `{ "month": "YYYY-MM" }` | `build_salary_workbook` | тот же | XLSX: листы итогов по сотрудникам, по сменам, ставки |
| `GET /api/employees/me/earnings?month=` | `build_employee_earnings` | месяц | только текущий сотрудник |

**Роутер:** `backend/app/routers/reports.py`, `backend/app/routers/employees.py`  
**Схема запроса месяца:** `MonthReportRequest` в `backend/app/schemas/reports.py` (`month: ^\d{4}-\d{2}$`).  
Ответ preview — **plain `dict`**, отдельной Pydantic-модели ответа **не найдено**.

**Дашборд:** сумма `month_salary_total` через `shift_pay_amount` по закрытым сменам месяца (`backend/app/services/dashboard.py` / связанные схемы).  
**Telegram-бот:** показывает `month_salary_total` в админ-статистике (`bot/app/handlers/admin.py`) — потребитель агрегата, не отдельный расчёт ставок.

### 3.2. Связь с модулем «Затраты» (expenses)

**Автоматической проводки ЗП в expenses при закрытии смены нет.**

- Закрытие смены → только поля смены `calculated_amount` / `rate_snapshot`.
- Автосоздание Expense найдено для ремонта/ТО (`backend/app/services/maintenance_expense.py`), **не** для зарплаты.
- В словаре категорий затрат может быть код/метка `salary` / «Зарплата» — ручной учёт, без связи со сменами.
- В аналитике история: расходы идут в `by_category`; стоимость смен — отдельное поле **`total_shift_cost`** из `Shift.calculated_amount` (`backend/app/services/analytics_history.py`), **не** через таблицу `expenses`.

---

## 4. UI

### 4.1. Где задают ставку

| Место | Кто | Файл | Что правит |
|-------|-----|------|------------|
| Форма сотрудника (создать/редактировать) | admin | `src/features/employees/components/EmployeeFormModal.tsx` | `hourlyRate` → `employees.hourly_rate`, подпись **«Базовая ставка, ₽/ч»** |
| Карточка → вкладка ставок | manager/admin | `EmployeeDetailSheet` → `EmployeeRatesSection` → `EmployeeRateModal` / `EmployeeRateFormFields` | CRUD `employee_rates`: вид работ или «Базовая (без типа)», ₽/ч, порог/множитель ОТ, период, заметки |
| Колонка списка | — | `employeesColumns.tsx` | отображение «Базовая ставка» |
| Вкладка «Расчёт ЗП» | manager/admin | `SalaryCalcTab.tsx` | preview месяца + выгрузка Excel, **не** редактирование ставок |
| Профиль сотрудника | — | `EmployeeProfileBody.tsx` | read-only «Ставка … ₽/ч» |

**Маршрут:** `src/app/routes/_layout/employees/index.tsx` (`tab: list | salary`).  
**Хуки API:** `src/features/employees/salaryHooks.ts`, CRUD сотрудника — `src/features/employees/hooks.ts`.

Подсказка у поля `hourlyRate` (текущий UI): применяется, если нет ставки по виду работ в «Ставки оплаты» — упрощённо относительно кода (не упоминает приоритет строки `employee_rates` с `work_type_id IS NULL` над `hourly_rate`).

Строка **«Базовая ставка (fallback)»** в `src/` **не найдена** (упоминания в docs о переименовании).

### 4.2. Признаки других схем оплаты в UI

**Не найдено** в UI ставок/ЗП: селекты «оклад», «посменная», «фиксированная сумма», отдельные схемы salary/fixed.

Везде акцент на **₽/ч** и сверхурочных часах. Слово «смена» в продукте означает рабочую смену (учёт времени), не схему «оплата за смену». Категория расходов «Зарплата» — не схема начисления.

---

## 5. Скрытые зависимости БД

Поиск по `backend` на `CREATE VIEW` / `TRIGGER` / `FUNCTION`, связанные со ставками/зарплатой:

**Не найдено.**

Зависимости только через обычные таблицы/FK и прикладной код (сервисы, отчёты, дашборд, аналитика `total_shift_cost`, бот по агрегату дашборда).

Риски при расширении схемы:
- уникальный индекс `uq_employee_rate_period`;
- JSON-контракт `rate_snapshot` (поля breakdown + `source`);
- потребители `calculated_amount` (отчёты, дашборд, аналитика, Shift API).

---

## 6. API-эндпоинты (ставки и зарплата)

Префиксы из `backend/app/main.py`.

### 6.1. `/api/employee-rates` — `backend/app/routers/employee_rates.py`  
Auth: manager (`require_manager`).  
Схемы: `backend/app/schemas/employee_rate.py`.

| Метод | Путь | Запрос | Ответ |
|-------|------|--------|-------|
| GET | `/api/employee-rates` | query `employee_id?` | `list[EmployeeRateResponse]` |
| GET | `/api/employee-rates/calculate-preview` | `employee_id`, `hours`, `shift_date`, `work_type_id?` | `RatePreviewResponse` `{ total, source, breakdown }` |
| POST | `/api/employee-rates` | `EmployeeRateCreate` | `EmployeeRateResponse` 201 |
| PATCH | `/api/employee-rates/{rate_id}` | `EmployeeRateUpdate` | `EmployeeRateResponse` |
| DELETE | `/api/employee-rates/{rate_id}` | — | 204 |

**EmployeeRateCreate:** `employee_id`, `work_type_id?`, `rate≥0`, `overtime_multiplier` (def 1.0), `overtime_threshold_hours` (def 8.0), `valid_from`, `valid_to?`, `notes?`  
**EmployeeRateResponse:** id, employee_id, employee_name, work_type_id/name, rate, overtime_*, valid_from/to, notes.

### 6.2. Сотрудник — legacy ставка

| Метод | Путь | Поле |
|-------|------|------|
| CRUD | `/api/employees` | `hourly_rate` в Create/Update/Response (`backend/app/schemas/employee.py`) |
| — | `/api/auth/...` ответы | также отдают `hourly_rate` сотрудника |

### 6.3. Отчёты и «мои начисления»

| Метод | Путь | Тело/query | Ответ |
|-------|------|------------|-------|
| GET | `/api/reports/salary-preview` | `month` | dict: month, from, to, summary[], shifts[], totalAmount |
| POST | `/api/reports/salary` | `MonthReportRequest` | XLSX stream |
| GET | `/api/employees/me/earnings` | `month` | dict от `build_employee_earnings` |

### 6.4. Побочный эффект на сменах

`/api/shifts` (close/create/update): в `ShiftResponse` — `calculated_amount`, `rate_snapshot` (`backend/app/schemas/shift.py`). Отдельного «salary calculate» эндпоинта кроме preview rates **нет**.

### 6.5. Прочие потребители (не отдельные rate-API)

- Dashboard: `month_salary_total`
- Analytics history: `total_shift_cost`
- Holding-отчёты: тип `salary` в каталоге (часть сценариев holding — `group_unsupported` / без `month_salary_total` на child — см. тесты)
- Telegram bot: отображение фонда ЗП из статистики

Отдельного мобильного salary-API **не найдено** (тот же web API; отдельного native client rate-контракта в репозитории нет).

### 6.6. Аналитические разрезы модуля «Затраты»

**Модель:** `backend/app/models/expense.py`

Поля: `date`, `category`, `amount`, `description`, `supplier`, `payment_method`, **`equipment_id`** (опционально), `created_by`, `org_id`.

| Разрез | Поддержка |
|--------|-----------|
| По сотруднику (кому платили / за кого) | **Нет** (`employee_id` на expense **не найден**) |
| По подразделению | **Не найдено** |
| По объекту работ / полю / локации | **Не найдено** (только опционально **техника** `equipment_id`) |
| По категории | Да (`category` string) |
| Фильтры API list | `from`/`to`, `category`, `equipment_id` |

**Вывод для будущих проводок ЗП:** текущий Expenses **не готов** к детализации «сотрудник / подразделение / объект работ» без расширения модели; сейчас максимум — ручная категория + опционально техника.

---

## 7. Ограничения и риски

### 7.1. Тесты

| Файл | Что покрыто |
|------|-------------|
| `backend/tests/test_salary.py` | `calculate_amount` с null-полями rate → fallback rate 100, 10 ч → total 1000 при multiplier 1 |
| `backend/tests/test_dashboard_salary_month.py` | границы месяца (`month_range` / leap Feb), не полный payroll |
| `backend/tests/test_integration.py` (`test_close_shift_salary`) | после закрытия смены `calculated_amount ≥ 0` |
| `backend/tests/test_close_shift_online.py` | close выставляет `calculated_amount` |
| `backend/tests/test_holding_reports.py` / `test_holding_api.py` | holding и salary-отчёт / отсутствие поля на child |

**Не найдено:**
- тестов приоритета `get_rate_for_shift` (work_type → base → hourly_rate);
- API-тестов CRUD `/api/employee-rates` и `salary-preview`;
- frontend-тестов SalaryCalc / EmployeeRates (нет `*salary*` / `*EmployeeRate*` test files в `src`).

Скрипт (не pytest): `backend/scripts/smoke_salary.py`.

### 7.2. Миграции / недоделанные типы оплаты

Найдены только:
- `ca84ef64c25e` — `employees.hourly_rate`
- `009_employee_rates` — таблица rates + поля смены
- `010_multi_org` — `org_id` на rates

**Не найдено** миграций с заделом под оклад / посменную / сдельную / `pay_type`, которые «бросили на полпути».

### 7.3. Прочие риски для универсальной системы

1. Вся продуктовая семантика и UI завязаны на **₽/ч**.
2. Три уровня «базы» легко путаются (`employee_rates` NULL work type vs `employees.hourly_rate`).
3. Нет связи ЗП ↔ Expenses — любая «проводка в затраты» будет новым контуром.
4. Expenses без `employee_id` / подразделения / объекта работ ограничивает детализацию проводок.
5. Слабое тестовое покрытие выбора ставки и API отчёта.
6. `rate_snapshot` JSON — контракт для отчётов; смена схемы overtime/pay type потребует миграции смысла снимков и, возможно, бэкфилла.

---

## Краткая схема AS-IS

```
Смена (закрыта)
  → hours = duration_rounded
  → ставка: work_type rate → employee_rates(base) → employees.hourly_rate
  → amount = regular + overtime (порог/множитель со ставки или defaults 8 / 1)
  → Shift.calculated_amount + rate_snapshot

Отчёты / дашборд / аналитика total_shift_cost читают calculated_amount
Expenses: связи нет (только ручная категория «Зарплата» при желании)
```

Конец отчёта.
