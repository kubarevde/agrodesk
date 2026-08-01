# AgroDesk — preprod full release review

**Дата:** 2026-07-31  
**Версия продукта:** API / README **5.0.0**  
**Alembic head:** `038_shipment_cancel_reason`  
**Опора:** [agrodesk-audit.md](./agrodesk-audit.md), [inventory-harvest-audit.md](./inventory-harvest-audit.md), [inventory-harvest-unify-review.md](./inventory-harvest-unify-review.md), свежие фиксы harvest/заявок/ТМЦ/мессенджера/UI.

---

## Вердикт

### **DEPLOY_OK**

**Можно катить на прод** при обязательных условиях ниже. Блокирующих дефектов схемы, доменной модели harvest‑флоу или красного CI‑гейта по unit‑тестам **не найдено**.

### Условия деплоя (MUST перед `./deploy.sh`)

1. **Именованный бэкап БД + uploads** на VPS (`./scripts/backup_db.sh`, `./scripts/backup_uploads.sh` или nightly).  
   `deploy.sh` **не** делает бэкап сам — только `build` → `up` → `alembic upgrade head`.
2. Дождаться **зелёного CI** на `main` (Frontend CI + Backend workflow при изменениях `backend/**`).
3. На VPS: `git pull` → `./deploy.sh` → проверить:
   - `GET /api/health` → `db_revision` == `code_head` == `038_shipment_cancel_reason`, `db_up_to_date: true`;
   - `docker exec agrodesk_api alembic current` → `038_shipment_cancel_reason`.
4. Короткий **smoke на проде** (10–15 мин):
   - логин manager/admin;
   - harvest‑SKU: сохранить культуру → в ответе PATCH есть `crop_code`, в карточке имя («Пшеница»);
   - поле → «Собрать урожай» → приход `harvest_income` с `field_id`;
   - заявка harvest → complete → расход `shipment_request`;
   - «Доход по урожаю» → запись в `/shipments`;
   - мессенджер: 1 сообщение → delivered/read галочки;
   - «Моя смена»: кнопки читаемы на desktop/mobile.

**Откат:** не полагаться на `alembic downgrade` на проде (036 data‑only no‑op; drop columns в 033/035). При инциденте — **restore из бэкапа**.

---

## 1. Обзор релиза

В релиз входят (поверх базы 5.0):

| Блок | Содержание |
|------|------------|
| Harvest‑флоу | Поле → `POST /fields/{id}/harvest` → склад `harvest_income` + `field_id`; harvest‑SKU с обязательным `crop_code` |
| Заявки | `kind` inventory/harvest; списание при complete; `cancel_reason` (038); create без лимита по остатку, stock-check только на complete |
| Shipments | KPI‑контур культур; связь с done harvest‑заявкой; без дублирования складского списания |
| ТМЦ | Поиск, UI Select культуры, человекочитаемые имена культур, guard против stale API без `crop_code` |
| Мессенджер | Чаты/сообщения/статусы доставки‑прочтения (032+) |
| Support / гайд | Тикеты, guide, суперадмин inbox |
| UI | Тексты без «(shipments)»/кодов в UI; один ₽; кнопки «Моя смена» / карточка заявки |

---

## 2. Миграции и схема

### 2.1 Head и цепочка

| Revision | Суть |
|----------|------|
| `032_messenger_chats` | Мессенджер |
| `033_harvest_tmc_link` | `inventory_items.crop_code`, `shipments.shipment_request_id`, seed category `harvest` |
| `034_request_kind_domains` | `shipment_requests.kind` |
| `035_crop_code_unify` | `locations.crop_code`, `shipments.crop_code` + backfill |
| `036_harvest_crop_required` | data cleanup; **downgrade = no‑op** |
| `037_harvest_field_income` | `inventory_operations.field_id` |
| **`038_shipment_cancel_reason`** | `shipment_requests.cancel_reason` (**текущий head**) |

Локальная/dev БД на момент аудита: `alembic current` = `038`, `/api/health` `db_up_to_date: true` (порты `:8000` и `:8033`).

### 2.2 Проверка целостности

| Проверка | Результат |
|----------|-----------|
| `alembic downgrade -1` (038→037) → `upgrade head` | **OK** |
| Колонки в information_schema | `inventory_items.crop_code`, `inventory_operations.field_id`, `locations.crop_code`, `shipments.crop_code` / `shipment_request_id`, `shipment_requests.kind` / `cancel_reason` — на месте, типы ожидаемые |
| Ручные DDL вне Alembic | Не обнаружены в коде релиза |

### 2.3 Риски миграции на прод

- **Низкий** для additive миграций 033–038 (nullable / server_default).
- **Средний ops‑риск:** забытый бэкап; слепой downgrade после 036.
- **Dev‑ловушка (не прод, но важна):** Vite proxy по умолчанию → `:8000`. Если на `:8000` крутится **старый** процесс (`code_head=032`), UI показывает «Позиция обновлена», а `crop_code` в ответе нет. На проде один контейнер `api` — риск ниже; на локалке держать актуальный uvicorn на порту proxy.

---

## 3. Тесты и качество кода

### 3.1 Таблица прогонов (2026-07-31)

| Suite | Результат | Комментарий |
|-------|-----------|-------------|
| `pytest tests/` | **227 passed**, 1 warning (statsmodels ConvergenceWarning) | Полный backend; не собирать `backend/scripts/` (ломает collection) |
| Harvest / field harvest / inventory SKU | Covered в полном прогоне | Ранее зелёные в unify‑review |
| Shipment requests / cancel / stock | Create без stock-gate; complete режет нехватку; сценарий «сток упал после start» и «create при нуле → income → complete» | |
| Messenger API / realtime | В полном `tests/` | Отдельных fail нет |
| Vitest | **242 passed** / 54 files | После фикса 3 тестов (см. ниже) |
| oxlint (`npm run lint`) | **exit 0**, warnings only | Fast‑refresh / exhaustive‑deps — tech debt, не блокер |
| Playwright e2e | Не гонялся локально в этом аудите | Есть workflow `.github/workflows/e2e.yml` (PR); для релиза — CI green / staging smoke |
| mypy/ruff (backend) | Не как жёсткий gate в CI | Backend CI = alembic + seed + pytest |

### 3.2 Что починено в ходе аудита (тесты)

1. **Vitest** `apiError.test.ts` — ожидание под фактическое поведение: `Error.message` предпочитается fallback.
2. **Vitest** `ShipmentRequestsList.test.ts` — mock `useDictionary` + QueryClient (карточки/таблица резолвят имя культуры).
3. **Pytest** cancel без body → 422: тесты передают `{"reason": "..."}` (контракт 038).
4. **Pytest** `test_complete_blocked_when_insufficient_stock`: сценарий «сток упал после start» через expense; create при qty > stock разрешён.

### 3.3 Не блокеры

- `statsmodels` ConvergenceWarning в forecasting.
- oxlint warnings на route file exports / hooks deps.
- `src/App1.tsx` unreachable warning — legacy file.
- Migration smoke тесты мутируют общую `DATABASE_URL` (уже отмечено в unify‑review) — на CI отдельная DB.

---

## 4. Функциональный аудит

Проверка опирается на код + автотесты + health/schema + предыдущие smoke/HAR‑фиксы. Полный ручной browser‑проход всех ролей в этом прогоне **не** выполнялся (см. условия smoke на проде).

### 4.1 Auth и роли

| Проверка | Статус |
|----------|--------|
| Org JWT + section/action permissions | Архитектура на месте (`permissionActions`, `makeSectionBeforeLoad`) |
| Superadmin отдельный контур | Да |
| Employee не видит admin sections | По коду permissions; smoke на проде желателен |

### 4.2 Поля и агрокалендарь

| Проверка | Статус |
|----------|--------|
| Культура: UI Select, имена без кода | Да (`FieldFormDialog`, dictionary) |
| Контуры / карта | В репозитории есть geometry/contour editor; spot‑check карты — на smoke |
| Агропланы ↔ смены | Модели/миграции 022–023; тесты agro‑plan в suite |

### 4.3 Harvest‑флоу (поле → склад → заявка → shipments)

| Шаг | Статус |
|-----|--------|
| Поле + crop_code | 035 + API |
| Harvest‑SKU + crop_code обязателен | 036 + validation + FE Select |
| Сбор → `harvest_income` + `field_id` | 037 + `test_field_harvest` |
| Заявка harvest → complete → expense `shipment_request` | Да; не пишет в shipments |
| Доход по урожаю (shipments) | Отдельный KPI‑контур; тексты без «(shipments)» |
| HAR‑инцидент crop_code | Фронт слал код; stale API на `:8000` игнорировал; guard + актуальный backend |

### 4.4 Склад / ТМЦ

| Проверка | Статус |
|----------|--------|
| Поиск | Пофикшен ранее; не трогали в последних UI‑промптах |
| Культура только имя | Form options через `buildDictionarySelectOptions` (label=name) |
| Сохранение crop_code | Backend + FE guard |

### 4.5 Заявки

| Проверка | Статус |
|----------|--------|
| Лейблы «Количество, кг» / «Цена за килограмм» | Да (динамически по unit) |
| Один ₽ | `formatMoney` единый; убран дубль |
| Культура: имя | Cards/Table/Detail + dictionary |
| Отмена с причиной | API + UI (038); тесты обновлены |
| Кнопки карточки заявки | Паттерн `Button`+`navigate` (без сломанного `asChild`+Link) |

### 4.6 Мессенджер

| Проверка | Статус |
|----------|--------|
| API / realtime tests | В pytest suite — passed |
| UX delivered/read | По коду фичи; ручной smoke на проде |

### 4.7 «Моя смена»

| Проверка | Статус |
|----------|--------|
| Desktop/mobile кнопки | `ManagerMyShiftView` / `CurrentShiftCard`: stack, `min-h-14`, text readable |

### 4.8 Дашборд и отчёты

| Проверка | Статус |
|----------|--------|
| Dashboard summary shipment requests | Тест зелёный после cancel body |
| Excel reports | Endpoints в registry; полный ручной export — на smoke |
| KPI shipments | Только таблица `shipments` (два контура — осознанный ADR) |

### 4.9 Прочие модули

Техника, ремонты, закупки, support — не в фокусе регрессий harvest; критичных fail в полном pytest нет. Happy‑path на проде — выборочно.

---

## 5. UI/UX

### Стало лучше

- Человекочитаемые культуры и подписи заявок/ТМЦ/урожая.
- Убран машинный «(shipments)» / «Культура (код): wheat».
- Один символ валюты.
- Кнопки back/action на карточке заявки приведены к паттерну Support/Equipment/Shipments header.
- «Моя смена»: крупные тач‑таргеты, без уродливого переноса на узкой ширине.

### Остаточные шероховатости (NICE)

- Длинный лейбл «Создать запись отгрузки урожая» на очень узких экранах — читаем (nowrap), но может быть широким; сокращение текста — опционально.
- Dev: риск «ложного успеха» ТМЦ при stale backend — есть toast‑guard.
- Два контура «продажа» (складская заявка vs shipments KPI) требуют дисциплины пользователей/обучения (гайд).

### Карта / маркеры

Стили маркеров/контуров в коде полей; визуальный QA — в smoke на staging/проде.

---

## 6. Инфраструктура и деплой

| Элемент | Статус |
|---------|--------|
| Канон прод | VPS `./deploy.sh` + Compose (`docs/PROD-UPDATE.md`) |
| Миграции в деплое | Да: `docker exec agrodesk_api alembic upgrade head` |
| Бэкап в `deploy.sh` | **Нет** — ручной MUST |
| CI frontend | oxlint + Vitest на PR/main |
| CI backend | Postgres 16 + alembic + pytest (path filter `backend/**`) |
| CI e2e | Playwright на PR |
| Object Storage фронта | Не используется (убрано из канона) |
| Логи | `backend/logs`, docker logs api; адекватно для post‑release triage |
| Feature flags harvest/messenger | Отдельных kill‑switch флагов нет — модули всегда в сборке |

---

## 7. Оценка реализации

### Сильные стороны

- Цельная цепочка harvest без смешения KPI и склада (ADR соблюдён).
- Additive миграции, понятный rollback через backup.
- Хорошее покрытие pytest по домену harvest/заявок/склада.
- FE: Query hooks, zod‑формы, русские UX‑тексты после полировки.
- Ops‑документация (`PROD-UPDATE.md`, backup scripts) зрелая.

### Слабые места / компромиссы

- `crop_code` для harvest обязателен на уровне приложения, не DDL NOT NULL.
- Общая локальная БД для pytest migration smoke — риск «уронить» live API при полном прогоне.
- `Button asChild` в проекте фактически не поддержан UI‑kit (Base UI `render`) — один раз уже сломал layout; стоит не использовать.
- Два контура продаж (заявка vs shipments) — продуктовая сложность для пользователей.
- Playwright не в каждом локальном preprod‑прогоне.

---

## 8. Вердикт (кратко)

| | |
|--|--|
| **Статус** | **DEPLOY_OK** |
| **Формулировка** | Можно катить после бэкапа, зелёного CI и smoke на проде по чеклисту §«Условия деплоя». |
| **Блокеры** | Нет |

---

## 9. Рекомендации

### MUST сразу вокруг релиза

1. Бэкап БД + uploads на VPS **до** `./deploy.sh`.
2. Проверить `/api/health` = 038 / `db_up_to_date`.
3. Smoke harvest + заявка + shipments + мессенджер (чеклист выше).
4. Убедиться, что бот (если на bothost) имеет актуальный `BOT_INTERNAL_SECRET` и один polling.

### MUST‑do в ближайший пост‑релизный цикл (не блокирует кат)

1. Добавить в `deploy.sh` (опциональный флаг) вызов backup перед migrate — чтобы не зависеть от памяти оператора.
2. В CI/docs явно: `pytest tests` (не корень `backend/` со `scripts/`).
3. Не использовать `Button asChild`+`Link` без официальной поддержки в UI‑kit; eslint/custom rule — NICE.

### NICE‑to‑have

1. Сократить лейбл кнопки дохода по урожаю при необходимости.
2. Staging‑окружение с отдельной БД для migration smoke.
3. Расширить Playwright: harvest create → collect → request → shipment.
4. Чистка QA‑шума (`Domain harvest *`) на demo‑орге.
5. Закрыть oxlint warnings по route‑exports / App1.

---

## 10. Итог одной строкой

**Релиз готов к проду при бэкапе + upgrade до `038` + коротком smoke; реализация harvest/заявок/ТМЦ/мессенджера и UI‑фиксов достаточно качественная для выката, с понятным tech debt и без известных блокеров.**
