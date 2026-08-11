# Дополнение к AS-IS оплате труда (точечная доразведка)

Дата: 2026-08-10  
Базовый отчёт: `docs/payroll-as-is-report.md` (не переписывался).  
Режим: только чтение кода.

---

## 1. Справочники единиц измерения

**Общего справочника единиц (таблица / enum / `org_dictionaries` type=`unit`) — не найдено.**

Как устроено сейчас:

| Место | Хранение | Ограничение значений |
|-------|----------|----------------------|
| `inventory_items.unit` | `String(50)`, NOT NULL | свободная строка |
| `tmc_shipments.unit` | `String(40)`, NOT NULL | копия/снимок с позиции |
| marketplace listing `unit` | `String(40)` | свободная строка |
| sharing `price_unit` | `String(50)`, nullable | свободная строка |

**Файлы:**  
- `backend/app/models/inventory.py` (`unit`)  
- `backend/app/models/tmc_shipment.py`  
- `src/features/inventory/components/InventoryItemFormModal.tsx` — поле «Ед. изм.» как обычный `<Input>`, default `'л'`; при категории урожая подставляется `'кг'`  
- `src/features/inventory/schemas.ts` — `unit: z.string().min(1)`

В seed словарей (`backend/app/models/dictionary.py` → `DEFAULT_DICTIONARY_ITEMS`) есть типы `crop`, `inventory_category`, `expense_category` и др., **но не units**.

**Вывод для сдельной выработки (га, тонна, кг, штука):** переиспользовать «общий справочник единиц» нельзя — его нет. Нужен либо минимальный отдельный список/словарь (новый `org_dictionaries` type или константа в коде), либо свободный текст по паттерну ТМЦ. Готовых значений «га» / «тонна» / «шт» в каноническом enum **не найдено**.

---

## 2. Модель Expense — детали

**Файл модели:** `backend/app/models/expense.py`  
**Схемы API:** `backend/app/schemas/expense.py`  
**Роутер:** `backend/app/routers/expenses.py`

### Поля (модель)

| Поле | Тип | Nullable | Примечание |
|------|-----|----------|------------|
| `id` | UUID PK | нет | |
| `org_id` | UUID FK → organizations | нет | multi-tenant |
| `date` | Date | нет | |
| `category` | String(100) | нет | код категории (см. ниже) |
| `amount` | Numeric(12,2) | нет | |
| `description` | Text | да | в Create API — обязателен (min 2) |
| `supplier` | String(200) | да | |
| `payment_method` | String(100) | да | API enum `cash` / `transfer` / `invoice` |
| `equipment_id` | UUID FK → equipment | да | миграция `003_expense_equipment` |
| `created_by` | UUID FK → employees | да | |
| `created_at` | DateTime(tz) | нет | |

### Индексы / soft-delete

- Явных `__table_args__` / `Index` на модели Expense **не найдено**.
- В `ca84ef64c25e_initial_schema.py` таблица `expenses` создаётся без доп. индексов (только PK + FK `created_by`).
- По поиску миграций: отдельных `CREATE INDEX` на `expenses` **не найдено**.
- **Удаление:** hard delete — `await db.delete(expense)` в `DELETE /api/expenses/{expense_id}` (`backend/app/routers/expenses.py`). Поля `is_active` / `deleted_at` **нет**.

### Category

- В БД — **свободная строка** `String(100)`, не PostgreSQL enum.
- По смыслу API — **код из org-словаря** `org_dictionaries` с `type = 'expense_category'` (комментарий в `ExpenseCreate`).
- Seed по умолчанию (`backend/app/models/dictionary.py`):

```text
expense_category:
  fuel → Топливо
  fertilizer → Удобрения
  parts → Запчасти
  salary → Зарплата
  rent → Аренда
  other → Прочее
```

**Техническое имя зарезервированной категории зарплаты:** code = **`salary`**, отображаемое имя = **«Зарплата»**.  
Также фронт-лейбл: `src/features/dictionaries/labels.ts` → `salary: 'Зарплата'`.  
В отчётах: `backend/app/services/reports.py` map `'salary': 'Зарплата'`.

Организация может добавлять свои коды через API словарей; `salary` — seed-дефолт, не жёсткий DB constraint.

---

## 3. Action permissions — шаблон для payroll.*

**Backend:** `backend/app/services/action_permissions.py`  
**Frontend sync:** `src/lib/permissionActions.ts`

### Полный `ACTION_KEYS` (сейчас)

| Key | Label (RU) |
|-----|------------|
| `shift.open_own` | Открыть свою смену |
| `shift.open_for_others` | Открыть смену за другого |
| `shift.close_own` | Закрыть свою смену |
| `shift.close_others` | Закрыть чужую смену |
| `inventory.operate` | Приход / расход / корректировка ТМЦ |
| `inventory.manage_items` | Управление позициями склада |
| `purchase.create` | Создавать заявки на закупку |
| `purchase.manage` | Управлять закупками (удаление, затраты) |
| `support.view_org_tickets` | Видеть все обращения организации |
| `shipment_requests.manage` | Управлять заявками на отгрузку ТМЦ |
| `shipment_requests.execute` | Исполнять заявки на отгрузку ТМЦ |
| `marketplace.manage` | Управлять витриной маркетплейса |
| `holding.view` | Обзор дочерних КФХ |
| `holding.switch` | Переключение в дочернюю КФХ |

**Связанные со сменами / складом / закупками** (релевантный шаблон):  
`shift.*`, `inventory.*`, `purchase.*`, `shipment_requests.*`.

### Паттерн именования и назначения

- Формат: **`domain.verb`** (точка), глаголы `open` / `close` / `operate` / `manage` / `create` / `execute` / `view` / `switch`.
- Пара **manage vs execute** уже есть у заявок на отгрузку:  
  - `*.manage` — админский контур (создание/управление);  
  - `*.execute` — исполнительский.
- `purchase.create` / `purchase.manage` — create vs полный manage.
- Implied от секций: `SECTION_IMPLIED_ACTIONS` (employee-safe); «for others» и manage — в `MANAGER_EXTRA_ACTIONS`.
- `marketplace.manage` / `holding.*` — **не** в manager defaults, только access group или admin.

**Рекомендуемый шаблон для новых прав (без реализации):**  
`payroll.confirm` / `payroll.pay` по аналогии с `shipment_requests.manage` + `shipment_requests.execute` (или `purchase.create` / `purchase.manage`), с синхронизацией **обоих** файлов `ACTION_KEYS` / `ACTION_LABELS`. Секция-импликация — если появится пункт меню ЗП; иначе только explicit group/manager grant.

Ключей `payroll.*` сейчас **не найдено**.

---

## 4. Настройка «Заявки на отгрузку ТМЦ» (boolean)

### Ключ в JSONB

**Имя поля:** `shipment_requests_enabled`  
**Константа:** `SHIPMENT_REQUESTS_ENABLED_KEY` в `backend/app/services/org_features.py`  
Хранится в `organizations.settings` (JSONB).

### Фактическое поведение сейчас (важно)

После миграции `055_shipment_requests_always_on` и правок `org_features`:

- `shipment_requests_enabled(settings)` **всегда возвращает `True`** (legacy `false` в JSONB игнорируется).
- `GET /api/settings/organization` всегда отдаёт `shipment_requests_enabled: true`.
- `OrgSettingsUpdate` **больше не принимает** запись этого флага (комментарий: removed from PATCH — module is always on).  
  Файл: `backend/app/routers/settings.py`.

### UI переключателя

**Рабочего org-UI переключателя «Заявки на отгрузку» в Настройках организации сейчас нет** (вкладки timezone / словари / доступы; `TimezoneTab` без этого флага).

Остатки паттерна на фронте (чтение флага, не запись):

- `src/features/settings/hooks.ts` — маппинг `shipmentRequestsEnabled: data.shipment_requests_enabled !== false`
- `src/components/layout/navigation.ts` — скрытие пункта меню, если флаг false
- `ShipmentRequestsPage` / `ShipmentsTmcOutboundPanel` — empty state «выключены в настройках», если `!== false`

То есть **исторический паттерн был:** ключ в `Organization.settings` + поле в Org Settings API + чтение на FE. **Сейчас запись через org settings API убрана**, модуль always-on.

### Живой аналог boolean-флага в settings JSONB

| Ключ | Где пишется | UI |
|------|-------------|-----|
| `marketplace_enabled` | Superadmin org API (`backend/app/routers/superadmin.py`) | checkbox в `src/features/superadmin/components/OrgPlatformFeaturesBlock.tsx` |
| `marketplace_enabled` | org GET settings — **read-only** | org PATCH не пишет |

**Для новой настройки «видимость ЗП сотрудникам»:**  
логичнее повторить паттерн **работающего** флага (`marketplace_enabled`: константа в `org_features.py` + JSONB key + GET/PATCH в `settings.py` с Switch/checkbox в org Settings), а не текущее «мертвое» состояние `shipment_requests_enabled`. Ключ-имя для shipment requests всё же эталон имени: `snake_case` в JSONB (`shipment_requests_enabled`).

---

## 5. Shift — agro_plan / work_type и форма закрытия

### Поля модели (`backend/app/models/shift.py`)

| Поле | Тип | Nullable | FK |
|------|-----|----------|-----|
| `work_type_id` | UUID | **нет** | `work_types.id` |
| `agro_plan_id` | UUID | **да** | `agro_plan.id` ON DELETE SET NULL |
| (+ рядом) `location_id` | UUID | нет | locations |
| `field_id` | UUID | да | locations |
| `equipment_id` / `implement_id` | UUID | да | … |

Связи: `work_type`, `selected_agro_plan` (`foreign_keys=[agro_plan_id]`).

### Где задаются work_type / agro_plan

**При открытии / ручном создании смены**, не при закрытии:

- `src/features/worktime/OpenShiftModal.tsx` — выбор `workType`, опционально `agroPlanId` (для полевых работ).
- Закрытие **не меняет** эти поля.

### Форма закрытия смены

| Слой | Файл | Поля формы |
|------|------|------------|
| UI | `src/features/worktime/CloseShiftModal.tsx` | description, comment (+ UI длительности/счётчика) |
| Zod | `src/features/worktime/closeShiftSchema.ts` | только `description` (5–500), `comment` optional |
| API | `ShiftClose` в `backend/app/schemas/shift.py` | `description` (min 5); comment — см. схему рядом |
| Обвязка | `WorktimeModals.tsx`, `ManagerMyShiftView.tsx`, `EmployeeMyShiftView` | открывают `CloseShiftModal` |

**Вывод:** опциональный «объём выработки» можно добавить точечно в `CloseShiftModal` + `closeShiftSchema` + `ShiftClose` (+ колонка на `shifts` или JSON), **без** переписывания всего компонента и **без** повторного выбора `work_type`/`agro_plan` на закрытии (они уже на смене). Компонент компактный (описание/комментарий).

Поля объёма выработки на Shift сейчас **не найдено**.

---

## 6. Employee — схема оплаты

**Модель:** `backend/app/models/employee.py`  
**Схемы:** `backend/app/schemas/employee.py`

Единственный enum на сотруднике: `EmployeeRole` (`admin` / `manager` / `employee`).

Поля, отдалённо связанные с оплатой:

- `hourly_rate` — Numeric, legacy ₽/ч  
- `rates` relationship → `employee_rates`

**Не найдено:** `payment_scheme`, `pay_type`, `pay_scheme`, `salary_type`, `wage_type`, оклад, неиспользуемые заготовки enum схемы оплаты.

Дублирования имени `payment_scheme` перед добавлением **нет**.

---

## Краткие выводы для проектирования

1. Единицы сдельщины — отдельный минимальный список; общего UOM-справочника нет.  
2. Expense: hard delete; category = string code; seed `salary` / «Зарплата»; индексов на таблице почти нет.  
3. Новые права — `domain.verb` в `ACTION_KEYS` BE+FE; образец manage/execute или create/manage.  
4. `shipment_requests_enabled` — имя ключа-эталон, но toggle в org UI фактически снят; для ЗП-видимости лучше живой паттерн `marketplace_enabled` + org Settings PATCH.  
5. Объём выработки — расширение `CloseShiftModal`, `work_type`/`agro_plan` уже на смене с открытия.  
6. `payment_scheme` на Employee можно вводить с нуля без конфликта имён.

Конец дополнения.
