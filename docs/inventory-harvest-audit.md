# Аудит: склад ТМЦ ↔ урожай (shipments) ↔ заявки (shipment_requests)

**Дата снимка:** 2026-07-30  
**Область:** только чтение кода, моделей и SELECT по локальной/dev БД.  
**Назначение:** честная фиксация «как есть» для последующего безопасного проектирования единой логики (без реализации в этом документе).

Связанные ADR/описания (норматив «как задумано»): [shipments.md](./shipments.md), [shipment-requests.md](./shipment-requests.md), [harvest-tmc-link.md](./harvest-tmc-link.md).

---

## 1. ТМЦ (склад)

### 1.1 Схема БД

#### `inventory_items`

| Колонка | Тип (модель) | Nullable | FK / ограничения |
|---------|--------------|----------|------------------|
| `id` | UUID PK | no | — |
| `org_id` | UUID | no | → `organizations.id` |
| `name` | String(200) | no | Unique (`org_id`, `name`) |
| `category` | String(50) | no | **свободный код**, не FK; ожидается код из `org_dictionaries.type='inventory_category'` |
| `crop_code` | String(80) | yes | **мягкая** связка на код словаря `crop` (без FK) |
| `unit` | String(50) | no | свободный текст (л, кг, шт…) |
| `current_stock` | Numeric(12,2) | no | денормализованный остаток |
| `min_stock` | Numeric(12,2) | no | порог «критично» |
| `total_capacity` | Numeric(12,2) | no | для прогресс-бара UI |
| `is_active` | Boolean | no | soft-archive |

**Деление по «разделам»:** единственный явный маркер — `category`. Код `harvest` («Урожай (на складе)») + опциональный `crop_code`. Отдельной таблицы «разделов» нет. Единицы измерения — не справочник, а строка на позиции.

Legacy enum `InventoryCategory` в коде (`fuel`, `fertilizer`, `parts`, `seeds`, `chemicals`, `harvest`, `other`) — подсказки типов; в БД хранится строка.

#### `inventory_operations`

| Колонка | Тип | Nullable | FK / смысл |
|---------|-----|----------|------------|
| `id` | UUID PK | no | — |
| `date` | Date | no | дата операции |
| `item_id` | UUID | no | → `inventory_items.id` |
| `type` | Enum `income` \| `expense` | no | направление |
| `quantity` | Numeric(12,2) | no | величина |
| `stock_after` | Numeric(12,2) | no | остаток после операции |
| `reason` | Text | yes | обязателен для `purpose=adjustment` |
| `supplier` | String(200) | yes | приход / поставщик |
| `cost` | Numeric(12,2) | yes | стоимость |
| `created_by` | UUID | yes | → `employees.id` |
| `created_at` | timestamptz | no | — |
| `equipment_id` | UUID | yes | → `equipment.id` (заправка/установка) |
| `purpose` | String(30) | no | смысловой тип операции (см. ниже) |

**Нет** обратной FK с `inventory_operations` на `shipment_requests` — связь хранится на заявке (`shipment_requests.inventory_operation_id`).

#### Справочник категорий ТМЦ

`org_dictionaries` где `type = 'inventory_category'`:

| Поля | `id`, `org_id`, `type`, `code`, `name`, `is_active`, `sort_order`, `created_at` |
|------|--------------------------------------------------------------------------------|
| Defaults | `fuel`, `fertilizer`, `seeds`, `parts`, `chemicals`, **`harvest`**, `other` |

Отдельной таблицы единиц измерения нет.

### 1.2 Код склада

- Роутер: `backend/app/routers/inventory.py`
- Сервис: `backend/app/services/inventory.py`
- Хелпер harvest: `backend/app/services/harvest_inventory.py`

**Типы операций (`type`):** только `income` / `expense`.

**`purpose` (фактически в коде):**

| purpose | Смысл |
|---------|--------|
| `opening` | начальный остаток при создании позиции |
| `general` | обычный приход/расход со склада |
| `adjustment` | корректировка (±), требует `reason` |
| `refuel` | заправка техники (`equipment_id`) |
| `install` | установка/списание на технику |
| `shipment_request` | расход при **complete** заявки |

Расход по заявке: `shipment_requests.complete_request` → `create_inventory_operation(..., purpose=shipment_request)` — **всегда** создаёт одну expense-операцию (и для `kind=inventory`, и для `kind=harvest`). В `shipments` при этом **не** пишет.

Спецусловия по типу ТМЦ: API/сервис склада **не** запрещают операции по `harvest`; UI помечает категорию и позволяет выбрать культуру (`crop_code`) при `category=harvest`.

### 1.3 Данные (READ ONLY, локальная БД на момент аудита)

| Метрика | Значение |
|---------|----------|
| Всего `inventory_items` | **427** (все active) |
| По категориям | `other` **378**, `fuel` 37, `harvest` **5**, `fertilizer` 2, `seeds` 2, `parts` 2, `chemicals` 1 |

Позиции `category=harvest` / с `crop_code` (срез): демо «Пшеница/Подсолнечник (урожай на складе)», тестовые `Domain harvest *` с `crop_code` wheat/barley, плюс позиции семян с «пшениц*/подсолн*» в **категории `seeds`** (это не harvest-SKU).

`inventory_operations` по `purpose` (срез): `opening` ~395 income; `shipment_request` expense **99**; `general` income/expense; `adjustment` ±24.

**Вывод по данным:** склад сильно зашумлён тестовыми `other`; урожай-как-SKU уже есть (мало позиций), параллельно семена зерновых живут как `seeds` — другое понятие.

---

## 2. Культуры и поля

### 2.1 Справочник культур

Таблица: **`org_dictionaries`** (`type='crop'`), не отдельная `crops`.

| Поле | Назначение |
|------|------------|
| `code` | стабильный ключ (`wheat`, `sunflower`, …) |
| `name` | отображаемое имя («Пшеница») |
| `org_id` | изоляция по организации |

Defaults: wheat, sunflower, corn, barley, rapeseed, winter, fallow, other. В dev-БД также много тестовых `kultura_test_*`.

**Кто ссылается (логически, часто без FK):**

| Потребитель | Как хранит культуру |
|-------------|---------------------|
| `locations` (поля) | `crop_type` String — обычно **имя** из словаря |
| `shipments` | `crop_type` String — имя (UI select по `name`) |
| `inventory_items` | `crop_code` — **код** словаря (только для harvest) |
| Агропланы | **нет** поля культуры; культура через `location.crop_type` |
| Usage check | `dictionary_usage.py`: считает `Location` + `Shipment` по `name` **или** `code`; **`inventory_items.crop_code` не учитывается** |

### 2.2 Поля (`locations`)

| Поле | Тип | Смысл |
|------|-----|--------|
| `kind` | String | `field` \| `object` |
| `crop_type` | String(100) nullable | **одна** культура на поле (текст) |
| `area_ha`, `polygon`, lat/lon | … | геометрия / погода |

`agro_plan_fields` — many-to-many план ↔ несколько `locations`, но культура по-прежнему одна на каждое поле.

**Несколько культур на одном поле по схеме:** нет (одно строковое поле). Смена культуры = перезапись `crop_type`.

### 2.3 Использование в коде

- UI полей / справочник настроек (`crop`).
- Агрокалендарь: планы привязаны к `location_id` (+ доп. поля через `agro_plan_fields`); культура — атрибут поля.
- Отгрузки урожая: select культуры по словарю `name` → пишется в `shipments.crop_type`.
- Аналитика/прогноз: доход из `shipments` (кг × цена), без разреза по культуре в monthly history (суммарный income).
- Склад harvest: select по `code` → `inventory_items.crop_code`.

**Разрыв:** `shipments.crop_type` / `locations.crop_type` = **имя**; `inventory_items.crop_code` = **код**. Сопоставление не жёсткое.

---

## 3. Отгрузки урожая (`shipments`)

### 3.1 Схема

Одна таблица **`shipments`**. Нет `shipment_items` / `shipment_documents`.

| Колонка | Тип | Nullable | Смысл |
|---------|-----|----------|--------|
| `id` | UUID | no | PK |
| `org_id` | UUID | no | → org |
| `date` | Date | no | дата отгрузки |
| `crop_type` | String(100) | no | культура (текст, не FK) |
| `quantity_kg` | Numeric(12,2) | no | кг |
| `destination` | String(200) | yes | покупатель/куда (**свободный текст**, не справочник) |
| `price_per_kg` | Numeric(10,2) | yes | цена |
| `notes` | Text | yes | — |
| `shipment_request_id` | UUID | yes | → `shipment_requests.id` ON DELETE SET NULL (управленческая ссылка) |
| `created_by` | UUID | yes | → employees |
| `created_at` | timestamptz | no | — |

**Нет** FK на поле/`locations`, нет FK на словарь культур, нет FK на контрагента.

### 3.2 Код

- Роутер: `backend/app/routers/shipments.py` (CRUD).
- Отдельного `services/shipments.py` нет — логика в роутере + `calc_total_sum`.
- Создание: **ручное** (менеджер/админ через UI). Автогенерации из склада/заявок **нет**.
- `resolve_shipment_request_id` — только проверка, что заявка той же org; **не** создаёт складских операций.
- Чтение склада / `inventory_operations` в API shipments: **отсутствует**.

**Кто читает `shipments`:**

| Место | Что берёт |
|-------|-----------|
| Дашборд `dashboard.py` | `month_shipments_kg`, `month_shipments_sum` |
| Excel `POST /api/reports/shipments` | культуры / кг / выручка |
| Сводка `build_summary` / баланс в reports | kg + сумма отгрузок vs expenses |
| `analytics_history.get_monthly_history` | `total_income` = Σ(kg × price) → **прогноз** (`forecasting` через history) |
| UI `/shipments` | список, KPI месяца, chart by crop |
| `dictionary_usage` | блокировка удаления культуры |

### 3.3 Данные (READ ONLY)

| Метрика | Значение |
|---------|----------|
| Строк | **7** |
| Период | 2026-07-13 … 2026-07-30 |
| Культуры | смесь прод-подобных («Пшеница», «Ячмень», …) и QA-строк |
| `destination` | свободный текст (элеватор / QA / null) |
| С `shipment_request_id` | **2** (линк уже использовался в тестах/ручной связке) |

Неурожайных «топливных» строк в `shipments` по смыслу колонок нет (всегда `crop_type` + кг).

---

## 4. Заявки на отгрузку (`shipment_requests`)

### 4.1 Схема

#### `shipment_requests`

| Колонка | Смысл |
|---------|--------|
| `inventory_item_id` | обязательная позиция склада |
| `kind` | `inventory` \| `harvest` (CHK); выставляется при create из категории позиции |
| `customer_name` | контрагент — **свободный текст** |
| `quantity`, `price` | кол-во / цена ед. |
| `planned_at` | план |
| `priority` | `normal` \| `urgent` |
| `status` | `new` → `in_progress` → `done` \| `cancelled` |
| `created_by`, `assigned_to` | сотрудники |
| `completed_at` | факт выполнения |
| `shift_id` | опционально открытая смена исполнителя на complete |
| `inventory_operation_id` | FK на единственную expense-операцию после complete |

#### `shipment_request_attachments`

Фото при complete: `image_url`, `filename`, `uploaded_by`, `request_id`.

### 4.2 Код

- `backend/app/routers/shipment_requests.py`
- `backend/app/services/shipment_requests.py`

**Complete:** всегда `create_inventory_operation` expense + `purpose=shipment_request`. Работает и для harvest-SKU. **Никогда** не INSERT в `shipments`.

Жёстких фильтров «только топливо» нет: любая активная `inventory_item`. Фильтр API `?kind=inventory|harvest`.

Связь с `shipments`: только опциональный `shipments.shipment_request_id` (обратная сторона — ручная). Read-only UI-блок на странице урожая ходит в `/api/shipment-requests?status=done&kind=inventory`, не в таблицу `shipments`.

### 4.3 UI (кратко)

| Экран | Поведение |
|-------|-----------|
| `/shipment-requests` | список/таблица, фильтры статус/тип/номенклатура, создание, назначение, start/complete/cancel |
| `/shipment-requests/my` | inbox исполнителя |
| `/inventory` | кнопка «Заявка» с карточки позиции → форма с preselect item |
| Дашборд | `shipment_requests_summary` (активные / срочные / на сегодня) — **не** kg урожая |
| Отчёт Excel | «Заявки на отгрузку» отдельным endpoint |
| `/shipments` | внизу пунктирный блок «Отгрузки ТМЦ по заявкам (склад)» (`kind=inventory` only), `data-domain="warehouse-only"`; KPI/chart/список выше — только `shipments` |

---

## 5. Пересечения, дырки, риски

### 5.1 Фактические пересечения доменов

| Пересечение | Как устроено сейчас |
|-------------|---------------------|
| Заявка → склад | Жёсткое: complete → одна `inventory_operations` |
| Заявка → урожай KPI | **Нет** автозаписи; только optional FK `shipments.shipment_request_id` |
| Страница `/shipments` ↔ заявки | Только UI read-only блок (отдельный query), **не** в агрегатах урожая |
| Дашборд | **рядом** виджеты: kg/сумма из `shipments` + критические ТМЦ + сводка заявок — разные источники на одном экране |
| Отчёты | Три отдельных Excel: shipments / shipment-requests / inventory; summary-баланс использует `shipments` + `expenses` (не заявки) |
| Прогноз | Income из **только** `shipments`; `inventory_operations` в forecasting **не** участвуют (в history — счётчик критических позиций склада для контекста, не как ряды операций) |

**Вывод:** backend shipments **не** join'ит `inventory_operations`. Смешение, которое путало пользователей раньше, было UX (блок заявок рядом с KPI), а не SQL-агрегацией урожая из склада.

### 5.2 Явные разрывы

1. **Культуры:** имя в полях/отгрузках vs `crop_code` на складе; usage dictionary не смотрит на `inventory_items.crop_code`.
2. **Контрагенты:** нет справочника; `destination` / `customer_name` — независимые строки.
3. **Поле ↔ отгрузка:** отгрузка урожая не знает, с какого поля вывезли.
4. **Двойной факт продажи пшеницы (логически возможен):**  
   - вручную `shipments` (KPI/прогноз) **и**  
   - заявка `kind=harvest` → `inventory_operations` (остаток),  
   без обязательной связи → риск **двойного смысла** «продали», хотя таблицы разные. Код это не склеивает и не запрещает.
5. **Шум данных:** 378 `other` на складе; QA-культуры в `shipments` и словаре — мешают читать «боевую» картину на dev.

### 5.3 Что нельзя ломать без риска для KPI/прогноза

**Читают `shipments` (менять семантику опасно):**

- `dashboard.fetch` → `month_shipments_kg` / `_sum`
- `reports.build_shipments_workbook`, summary balance
- `analytics_history.get_monthly_history` → `total_income` → forecast/analytics API
- UI KPI/график `/shipments`

**Читают склад (менять семантику остатков/заявок опасно):**

- `create_inventory_operation` / пересчёт `current_stock`
- complete заявки → `purpose=shipment_request`
- отчёт inventory, критические остатки дашборда
- заправки/install на технику

**`inventory_operations` в прогнозе рядов дохода/расхода по культурам — не используются.** Менять shipments «в пользу» склада 1:1 сломает forecast.

---

## 6. Варианты перехода к единой модели (без реализации)

### Вариант A — «Два контура + явный мост» (эволюция текущего ADR)

- KPI/прогноз урожая **только** `shipments`.
- Остатки зерна — только `inventory_items`/`operations` с `category=harvest` + `crop_code`.
- Заявки: `kind` уже разделяет UI/отчёты; complete harvest-SKU пишет только склад.
- Усилить мост: обязательный/рекомендуемый `shipments.shipment_request_id` **или** запрет complete harvest без последующего (или параллельного) документа урожая — по продуктовому правилу.
- Согласовать культуры: единый ключ (code) везде или маппинг name↔code в одном сервисе.
- Плюс: минимум ломки KPI. Минус: два факта «продажи» остаются возможны, нужна дисциплина/валидации.

### Вариант B — «Операционный документ один, учётные проекции разные»

- Заявка/наряд — единый workflow.
- При закрытии по политике org:
  - материалы → только `inventory_operations`;
  - урожай-на-складе → `inventory_operations` ± опционально авто-`shipments` **только** если включён флаг и культура/кг явно заданы (чтобы не тащить топливо в KPI).
- Жёсткий запрет ручного дубля без линка.
- Плюс: меньше ручных дыр. Минус: выше риск сломать прогноз при ошибке автосоздания `shipments`; нужна тщательная миграция и feature-flag.

**Рекомендация аудита для следующей итерации:** опираться на **вариант A** как безопасный baseline (уже частично реализован в коде/доках), затем точечно закрывать разрывы справочников и правила «один физический вывоз — одна управленческая связь».

---

## Что НЕ делали

В рамках этого аудита **не** выполнялось:

- изменение схемы БД, моделей, миграций, API, фронтенда;
- INSERT/UPDATE/DELETE по данным;
- рефакторинг доменов или «сшивка» учёта;
- реализация вариантов A/B.

Единственный артефакт — этот файл `docs/inventory-harvest-audit.md`.

Временный helper-скрипт для SELECT после снятия снимка удалён и в репозиторий не коммитился.

---

## Проверка «ничего не сломали»

После аудита ожидается зелёный прогон существующих тестов без изменения продакшен-логики (см. прогон в сессии агента: domain/request pytest и связанные Vitest — без правок кода бизнес-логики в этом промпте).
