# Головная организация → КФХ (ADR Phase 0/1)

Связанные документы: [marketplace.md](./marketplace.md) (изолирован, **не** входит в holding), [agrodesk-audit.md](./agrodesk-audit.md) (текущая tenant-модель).

**Статус:** Phase 1–4 + superadmin form/stats stabilize **сделаны**. Phase 0 контракт ниже остаётся нормативным. См. «Stabilize notes» в конце.

---

## Цель

Поддержать сценарий:

- есть **головная** организация (head);
- у неё несколько подчинённых **КФХ** (child = обычный org/tenant);
- у head есть обзор по связанным КФХ;
- из head можно **провалиться** в конкретную org (controlled switch);
- текущая tenant-модель **не** заменяется и **не** расширяется до multi-org JWT.

---

## Инварианты (обязательные)

1. **Single-org session:** один tenant JWT = один `org_id`. Claims multi-org в обычном org JWT запрещены.
2. **`OrgContextMiddleware`** (`backend/app/middleware/org_context.py`) остаётся single-org: читает `org_id` из JWT, не резолвит children.
3. Все существующие tenant API (`/api/dashboard`, `/api/reports/*`, inventory, settings, employees, …) остаются строго `WHERE … org_id = get_org_id(request)`. Запрещено добавлять `org_id IN (children)` в эти endpoints «по умолчанию».
4. Head **не** читает child-таблицы из head-сессии, кроме явных **holding** endpoints с allowlist и permission check.
5. **Superadmin** (`/superadmin/*`, отдельный JWT без `org_id`) ≠ роль директора холдинга. Tenant holding-права не выдают platform-superadmin.
6. Feature flags (`marketplace_enabled` и др.) **не** наследуются head → child.
7. Org **без** строк в link-таблице ведёт себя как сейчас (zero behavior change).
8. Login flow (`POST /api/auth/login` + `org_id`, FE `selected_org`) в Phase 0/1 **не** переписывается.

---

## Доменная модель Phase 1: link table

Рекомендация аудита — **additive link table**, не `parent_org_id` на `organizations` и не сущность `organization_group`.

### Предлагаемая схема (контракт; реализация позже)

```text
org_hierarchy_links
  id              UUID PK
  head_org_id     UUID NOT NULL → organizations.id
  child_org_id    UUID NOT NULL → organizations.id
  created_at      timestamptz
  UNIQUE (child_org_id)          -- один child только у одного head
  CHECK (head_org_id <> child_org_id)
  INDEX (head_org_id)
```

| Правило | Смысл |
|---------|--------|
| Head и child — обычные строки `organizations` | Нет второго типа tenant |
| Связь только через link | Обычная org без link = нет холдинга |
| Soft-delete org | Как сейчас (`is_active`); политика orphan/cascade — при реализации attach API |
| Marketplace / plan / max_employees | По-прежнему per-org |

**Почему не `parent_org_id`:** смешивает жизненный цикл org со структурой холдинга; сложнее отвязать/сменить head без ALTER semantics.  
**Почему не `organization_group` сейчас:** сценарий «1 head → N КФХ» не требует третьей сущности; group можно ввести позже поверх тех же links.

---

## Точки интеграции (as-is → надстройка)

| Контур | Файлы / API | Phase 1 |
|--------|-------------|---------|
| Org model | `backend/app/models/organization.py` | Без ломающих полей; новая model/таблица links |
| Auth login | `backend/app/routers/auth.py`, FE `LoginPage`, `selectedOrg.ts`, `storage.ts` | Без изменений |
| Org context | `middleware/org_context.py`, `dependencies/auth.py` | Без multi-org |
| Superadmin JWT | `dependencies/superadmin.py`, `routers/superadmin.py` | Attach/detach/list children **только** здесь (CRUD связей) |
| Permissions | `services/permissions.py`, `action_permissions.py` | Позже: actions `holding.view`, `holding.switch` (+ опц. section); **не** в defaults обычных org |
| Dashboard | `routers/dashboard.py`, `services/dashboard.py` | Контракт single-org; holding переиспользует **helpers** внутри, не расширяет `/api/dashboard` |
| Reports | `routers/reports.py` | То же; holding-отчёты — отдельные endpoints (фаза после overview) |
| Marketplace | `org_features.marketplace_enabled`, seller/public/superadmin routers | **Excluded** |

---

## API (Phase 1)

### Superadmin (управление связями) — реализовано

- `GET /superadmin/api/organizations/{org_id}/children`
- `GET /superadmin/api/organizations/{org_id}/children/available`
- `POST /superadmin/api/organizations/{org_id}/children` body `{ "child_org_id": "…" }`
- `DELETE /superadmin/api/organizations/{org_id}/children/{child_org_id}`

UI: модалка org (superadmin) — блоки «Сводка / Основное / Статус и лимиты / Platform features / Структура холдинга»; attach/detach детей вне submit формы. `GET …/organizations/{id}/parent` — read-only head для child.

Проверки attach: `head ≠ child`, unique child, нет цикла (child не предок head), inactive нельзя. Feature flags детей не трогаются.

### Holding (tenant) — Phase 2 (минимальный layer)

Префикс: `/api/holding/*`. Требует tenant JWT + action `holding.view` + текущий `org_id` — head в `org_hierarchy_links`.

| Endpoint | Поведение |
|----------|-----------|
| `GET /api/holding/children` | Список linked children (id/name/slug/is_active) |
| `GET /api/holding/overview` | Allowlisted KPI по каждому child + totals |

**Allowlist overview:** employees_count, active_shifts_count, month_shifts/hours, month_shipments_kg/sum, month_expenses_sum, critical_inventory_count, shipment_requests_active.

**Не отдаётся:** marketplace, salary detail, списки смен/сотрудников/позиций ТМЦ, settings, inventory dump.

`holding.switch` зарезервирован в ACTION_KEYS; endpoint switch — Phase 3.

### Switch / drill-in — Phase 3 (реализовано)

- `POST /api/holding/switch` `{ child_org_id }` — требует `holding.switch` + head link; выдаёт child JWT для shadow-admin (`HOLD-…`, `position=holding.switch`, без telegram).
- Claims `acting_from_head_org_id` / `acting_head_employee_id` — только для switch-back / UI / audit (**не** data scope).
- `POST /api/holding/switch-back` — возврат в head JWT исходного сотрудника.
- Audit: `holding_session` + `holding.switch` / `holding.switch_back` в head и child org.
- FE: «Открыть КФХ», баннер контекста, «В головную»; session apply как при login (token + caches + Dexie wipe).

До появления switch head **не** редактировал child через обычные tenant routes без смены JWT — это сохраняется.

### Holding reports overlay — Phase 4 (реализовано)

Обычные `/api/reports/*` остаются single-org. Holding — отдельные endpoints, вызывающие те же `build_*_workbook`.

| Endpoint | Поведение |
|----------|-----------|
| `GET /api/holding/reports/catalog` | Whitelist отчётов + `modes` (`child` / `group`) |
| `POST /api/holding/reports/export` | `{ report_id, mode, child_org_id?, period… }` → Excel |

**Group + child:** shipments, expenses, summary, inventory, purchases, maintenance — multi-sheet merge с листом «Область» и префиксом slug на листах.

**Child only:** timesheet, salary, shipment-requests, equipment, fields, season — без выдуманной агрегации (PII / локальные активы / зарплата).

**Не входит:** marketplace; скрытый `org_id IN (...)` в `/api/reports/*`.

FE: на `/reports` head с `holding.view` и links выбирает область (текущая org / одна КФХ / сводка); ordinary org UX без изменений.

---

## Permissions (контракт ключей)

Зарезервированные action keys (добавить в `ACTION_KEYS` только вместе с реализацией endpoints):

| Key | Назначение |
|-----|------------|
| `holding.view` | Children list + overview |
| `holding.switch` | Drill-in (поздняя фаза) |

Правила выдачи:

- только через существующую permission model (access group / явный grant);
- **не** в `DEFAULT_*` для обычных org без links;
- admin head-org может иметь полный набор секций своей org; holding-actions — отдельно и явно;
- никогда не мапить holding → superadmin JWT.

Опциональная FE-секция `holding` (nav) — только когда есть links + `holding.view`; иначе nav как сейчас.

---

## Фазы

| Фаза | Содержание | Runtime |
|------|------------|---------|
| **0** | ADR / контракт / инварианты | Документ |
| **1** | Миграция `org_hierarchy_links` + superadmin attach/detach/list + тесты инвариантов | **Сделано** (`043_org_hierarchy_links`) |
| **2** | `/api/holding/children` + `/overview` + `holding.view` + FE overview на `/dashboard` | **Сделано** |
| **3** | Auditable switch + `holding.switch` + FE banner | **Сделано** |
| **4** | Holding reports overlay (`/api/holding/reports/*`) поверх `build_*_workbook` | **Сделано** |
| **5+** | Опц. login picker UX / multi-membership | Отдельные задачи |

---

## Сознательно исключено из Phase 0–4 / stabilize

- Multi-membership одного человека в нескольких org
- Изменение глобальных unique `employee_code` / `telegram_id`
- Переписывание login picker / `GET /api/auth/orgs`
- Расширение `/api/dashboard` и `/api/reports/*` до multi-org
- Marketplace агрегации и наследование `marketplace_enabled`
- `parent_org_id` / сущность `organization_group`
- Второй dashboard/reports engine
- Выдача platform-superadmin tenant-пользователям
- Report-export telemetry (нет таблицы usage)
- N+1 в `list_organizations` superadmin

---

## Stabilize notes (post Phase 4)

Сделано при стабилизации / pre-deploy:

- JWT `acting_*` ↔ FE holding banner reconcile (`reconcileHoldingContextFromToken`)
- holding `getSnapshot` referentially stable (no infinite re-render after switch)
- единый `HOLDING_SHADOW_POSITION` в `holding_constants.py`
- holding reports catalog требует head org (как export)
- FE/BE report whitelist sync-тест
- `tsc` в CI; seller listing create payload typing; OrgChildrenSection Select typing
- docs status актуализирован

Оставлено на следующую фазу (не блокеры):

- FE потребление `/api/holding/reports/catalog` вместо локального `HOLDING_REPORT_SUPPORT` (сейчас locked тестом)
- admin без links получает holding actions → 403 на overview (шум, не дыра)
- superadmin org list N+1 counts
- login picker / multi-membership

---

## Чеклист после каждого runtime-шага (с Phase 1)

1. Backend tests (links + regression auth/permissions/dashboard).
2. Auth/permissions regression: org без links без изменений.
3. Обычный tenant: login → dashboard/reports/settings как раньше.
4. Superadmin: create/edit org не сломан; attach не ломает soft-delete.
5. Marketplace ветка и `marketplace_enabled` не затронуты (существующие boundary-тесты зелёные).

---

## Решения, отклонённые аудитом

| Вариант | Почему не берём в Phase 1 |
|---------|---------------------------|
| `organizations.parent_org_id` | Смешение структуры и lifecycle; хуже additive unlink |
| `organization_groups` + members | Лишняя сущность для 1 head → N children |
| Multi-org JWT / middleware | Ломает изоляцию всех `/api/*` |
| Head читает child через те же `/api/*` | Обход tenant isolation |
| Holding = superadmin | Смешение platform и tenant контуров |
