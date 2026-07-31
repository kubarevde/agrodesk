# Review: harvest ↔ ТМЦ ↔ заявки ↔ shipments (после промптов 1–6)

**Дата:** 2026-07-30  
**Область:** проверка реализации без новой бизнес-логики (код, миграции, тесты, spot-check API на demo).  
**Исходный аудит:** [inventory-harvest-audit.md](./inventory-harvest-audit.md)  
**Цепочка ADR:** [harvest-tmc-link.md](./harvest-tmc-link.md), [shipments.md](./shipments.md), [shipment-requests.md](./shipment-requests.md), [rollback-harvest-unify.md](./rollback-harvest-unify.md)

---

## Вердикт

**Готово к прод при условии:**

1. На целевой БД перед деплоем снят именованный бэкап (`scripts/backup_db_harvest_unify.*`).
2. Применены миграции до `037_harvest_field_income` (см. список ниже).
3. Smoke на проде: сбор с поля → приход склада; заявка harvest → complete → расход; отгрузка `shipments` без заявки и с привязкой к `done` harvest-заявке; KPI `/shipments` и прогноз без аномалий.

**DEPLOY_OK** — блокеров по схеме/домену harvest-флоу не найдено. Оговорки и NICE-to-have — ниже.

---

## 1. Схема БД и миграции

### 1.1 Сравнение с аудитом

| Изменение относительно аудита | Статус |
|-------------------------------|--------|
| `locations.crop_code` | **Добавлено** (035), nullable, soft backfill name→code |
| `shipments.crop_code` | **Добавлено** (035), nullable, soft backfill |
| `inventory_operations.field_id` → `locations.id` ON DELETE SET NULL | **Добавлено** (037) |
| `purpose='harvest_income'` | **В коде** (не enum БД; `purpose` остаётся String) |
| Обязательность `crop_code` для `category=harvest` | **В приложении** (036 data cleanup + валидация API), без NOT NULL в DDL |
| `shipments.shipment_request_id` / `inventory_items.crop_code` | Уже были в аудите (033+) |
| `shipment_requests.kind` | **Добавлено** (034), check `inventory` \| `harvest` |

**Не удалено / не сломано радикально:** таблицы и колонки аудита на месте; новые поля additive и nullable (кроме `kind` с server_default). Существующие типы не менялись destructive-way.

### 1.2 Alembic — harvest-флоу

| Revision | Описание |
|----------|----------|
| `033_harvest_tmc_link` | `inventory_items.crop_code`; `shipments.shipment_request_id`; seed category `harvest` |
| `034_request_kind_domains` | `shipment_requests.kind` + backfill |
| `035_crop_code_unify` | `locations.crop_code`, `shipments.crop_code` + backfill |
| `036_harvest_crop_required` | data: clear stray codes, backfill harvest, soft-disable test/incomplete rows; **downgrade = no-op** |
| `037_harvest_field_income` | `inventory_operations.field_id` + FK + index |

**Проверено на local/dev DB:**

- `alembic downgrade -1` (037→036) → `upgrade head` — OK.
- Полный цикл `029` ↔ `head` (через migration smoke tests после фикса) — OK; схема на `037_harvest_field_income`.

**Оговорки по downgrade:**

- `036`: data-only; structural downgrade no-op — откат данных только из бэкапа.
- `035`/`033`: drop columns — для prod предпочтителен restore (см. rollback doc), не «слепой» downgrade на проде.

### 1.3 Тесты миграций (мелкий фикс в этом ревью)

Smoke-тесты `test_messenger_chats_migration` / `test_shipment_requests_migration` устарели после 033–037:

- ожидали head == `032`;
- сравнивали колонки `inventory_operations` head ↔ после downgrade до `029` (ломалось на `field_id`).

**Исправлено** в тестах (ожидание head ≥ 032; учёт `field_id` как later column).  
**Риск ops:** эти тесты мутируют **общую** `DATABASE_URL` — при полном `pytest` могут на время уронить API. Рекомендация: отдельная CI DB / marker `migration`.

---

## 2. Домен культур (справочник ↔ поля ↔ ТМЦ ↔ shipments)

| Проверка | Результат |
|----------|-----------|
| Справочник `org_dictionaries(type='crop')` | Без смены модели; helper `crop_dictionary` / `resolve_crop_pair_for_org` |
| Поля: UI/API пишут name + `crop_code` | Да (fields router + тесты `test_crop_code_api`) |
| Shipments: то же | Да |
| Harvest-SKU требуют `crop_code` | Да (`harvest_inventory.resolve_inventory_crop_code`) |
| Spot-check demo (`GET /api/inventory?category=harvest`) | **69** позиций; **0** без `crop_code` (активные с кодом есть; test/Domain частично soft-disabled 036) |
| Поля с `crop_type` без `crop_code` | **0** на demo после backfill |
| Shipments с `crop_type` без `crop_code` | **0** на demo (после re-upgrade 035 filled 61) |

**Точка NICE:** на dev много QA-полей `Harvest field *` / SKU `Domain harvest *` от pytest — шум для ручного smoke, не блокер прод.

---

## 3. Флоу «Собрать урожай» → склад

| Проверка | Результат |
|----------|-----------|
| Endpoint | `POST /api/fields/{field_id}/harvest` |
| Операция | `type=income`, `purpose=harvest_income`, `field_id` заполнен |
| Не пишет в `shipments` | Подтверждено тестом и сервисом |
| Reject non-harvest item | 400 |
| Reject crop mismatch | 400 (`не совпадает`) |
| Pytest | `test_field_harvest.py` — зелёный |
| Spot-check | `GET .../operations?purpose=harvest_income` — операции с `field_id`/`field_name` есть |
| UI | `FieldHarvestModal` на карточке поля (отдельной `/fields/$id` нет) |

Пограничные кейсы (нет SKU / нет code) отдаются 400 с текстом, не 500 — по коду сервиса.

---

## 4. Склад урожая → заявки → расход

| Проверка | Результат |
|----------|-----------|
| Заявки на harvest-SKU | Разрешены; `kind=harvest` из категории |
| Complete | Одна `inventory_operations` expense, `purpose=shipment_request`; **не** создаёт `shipments` |
| Pytest | `test_harvest_shipment_request.py`, `test_shipments_domain.py` — зелёные после restore head |
| Dashboard `shipment_requests_summary` | Считает **все** kinds без фильтра (задокументировано в `dashboard.py`) |
| Отчёты Excel | Метки категории/purpose включают harvest / harvest_income |

---

## 5. Мост `shipments` ↔ заявки и KPI

| Проверка | Результат |
|----------|-----------|
| `shipments.shipment_request_id` | FK есть; валидация: только `kind=harvest` + `status=done` |
| Без заявки | Создание crop shipment по-прежнему OK |
| KPI / forecast | Источник дохода по-прежнему **только** `shipments` (аудит §5.3 не нарушен) |
| Pytest | `test_shipment_request_link.py`, analytics/forecast subset — OK |
| Spot-check demo | 57 shipments; 20 с `shipment_request_id`; удвоений семантики в коде нет |

Двойной «факт продажи» (склад по заявке + отдельный shipment без дисциплины) **по-прежнему возможен** продуктово — это осознанный ADR «два контура», не баг рефактора.

---

## 6. Регрессии

### Автотесты (этот прогон)

| Suite | Результат |
|-------|-----------|
| Harvest-related pytest (crop/harvest/link/domain) | **24 passed** |
| Inventory + shipment-requests + dashboard summary + analytics/forecast + dictionaries | **35 passed** |
| Shifts / agro-plan fields / access groups inventory | **13 passed** |
| Migration smoke (после фикса) | **2 passed**; DB вернулась на `037` |
| Полный `pytest tests/` (без realtime messenger) | Изначально **7 failed** из‑за устаревших migration asserts + каскад 500, пока DB была на `029`; после фикса migration + `upgrade head` критичные harvest/shipments снова зелёные |
| Vitest (fields/inventory/shipments/shipment-requests/help) | **60 passed** / 16 files |
| Playwright harvest e2e | **Не запущены:** нет chromium в sandbox Playwright cache (`npx playwright install` нужен локально/CI) — **env**, не логика |
| Bot tests | Не гонялись целиком; зависимости harvest-флоу в bot не добавлялись |

### Ручной smoke

Не полный UI-прогон в браузере в рамках этого ревью. API/demo spot-check + автотесты покрывают цепочку. Рекомендуется короткий ручной smoke на staging перед продом (см. вердикт).

Любые сбои messenger/support/offline вне harvest отмечать как **legacy / другой WIP**, не как блокер этого рефактора.

---

## 7. MUST-fix перед продом

Блокирующих дефектов схемы/флоу **нет**.

Обязательные **условия деплоя** (не код-баги):

1. Бэкап БД + `alembic upgrade head` до `037`.
2. Убедиться, что CI/локальный Playwright имеет браузеры, если e2e — gate релиза.
3. Не запускать migration smoke против prod DB.

*(Тесты миграций поправлены в этом ревью — MUST для зелёного CI, не для runtime прод.)*

---

## 8. NICE-to-have после первого прод

1. Очистка QA-мусора на demo (поля/SKU от pytest) или изоляция test org.
2. Migration tests → отдельная БД / pytest marker, чтобы не ронять shared API.
3. Жёсткий FK или usage-check словаря на `inventory_items.crop_code` (сейчас soft).
4. UX: подсказка «создайте harvest-SKU» если у культуры поля нет позиции.
5. Продуктовое правило против «двойной продажи» (обязательный/рекомендуемый link shipment↔заявка) — отдельный промпт.
6. `dictionary_usage`: учитывать `inventory_items.crop_code` (разрыв из аудита §5.2).
7. Поле ↔ документ отгрузки (откуда вывезли) — по-прежнему нет.
8. Полный e2e gate на CI после `playwright install`.
9. Документировать/автоматизировать soft-disable паттерны 036, чтобы случайно не гасить боевые имена.

---

## Рекомендация по деплою

```
DEPLOY_OK
```

Обоснование: аддитивные миграции 033–037 обратимы на уровне схемы (с оговоркой data no-op у 036); доменные инварианты «склад ≠ KPI shipments» сохранены; валидации harvest-income и моста к заявкам покрыты тестами; demo-данные по `crop_code` консистентны после backfill.  
Перед выкаткой — бэкап, upgrade, короткий staging smoke цепочки поле→склад→заявка→(опционально) shipment.
