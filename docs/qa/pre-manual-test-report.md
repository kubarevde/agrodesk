# Pre-manual QA report — AgroDesk

**Статус готовности: ГОТОВО К ПОЛНОМУ РУЧНОМУ ТЕСТИРОВАНИЮ**

| Поле | Значение |
|------|----------|
| Дата прогона | 2026-08-11 (UTC+7) |
| Commit база | `2f37222` (+ локальные QA-фиксы в рабочей копии) |
| Code / DB revision (QA) | `078_repair_tasks_section_grants` (head) |
| Тестовая БД | PostgreSQL `agrodesk_qa` на `localhost:5432` |
| QA API | `http://127.0.0.1:8001` (`DATABASE_URL` → `agrodesk_qa`, `RUN_SEED_ON_START=false`) |
| Frontend proxy | `VITE_API_PROXY_TARGET=http://127.0.0.1:8001` |
| Локальная demo-БД `agrodesk` | **не использовалась**; на момент аудита отставала (`029`) — не трогать без бэкапа |

---

## 1. Финальные результаты

| Проверка | Команда | Результат |
|---|---|---|
| Alembic upgrade head | `python scripts/qa_prepare_db.py` | **PASS** → `078_repair_tasks_section_grants` |
| Health / revision | `GET http://127.0.0.1:8001/api/health` | **PASS** `db_up_to_date: true`, revision = code head |
| Typecheck | `npx tsc -b` | **PASS** (0 ошибок) |
| Build | `npm run build` | **PASS** |
| Lint | `npm run lint` | **PASS** (warnings only) |
| Vitest | `npm test` | **PASS** 422 / 422 |
| Full pytest | `API_BASE_URL=…:8001 DATABASE_URL=<qa> pytest tests/ -q` | **PASS** 463 passed |
| Playwright (полный) | `CI=1 VITE_API_PROXY_TARGET=…:8001 npx playwright test` | **PASS** 24 passed |
| Playwright full suite script | `npm run test:e2e:full` | **PASS** 13 passed |
| Mobile smoke | e2e messenger mobile + workspace viewport 375 | **PASS** (в составе Playwright) |
| Login EMP000/1234 | API + UI smoke | **PASS** |

---

## 2. Среда

| Назначение | Команда |
|------------|---------|
| QA DB prepare | `python scripts/qa_prepare_db.py` |
| QA seed | `python scripts/qa_seed.py` |
| QA API | `$env:DATABASE_URL=…agrodesk_qa; uvicorn … --port 8001` |
| Frontend | `$env:VITE_API_PROXY_TARGET=http://127.0.0.1:8001; npm run dev` |
| Pytest | `$env:API_BASE_URL=http://127.0.0.1:8001; $env:DATABASE_URL=…agrodesk_qa; pytest tests/ -q` |
| E2E | `$env:CI=1; $env:VITE_API_PROXY_TARGET=http://127.0.0.1:8001; npm run test:e2e` |

Учётки: Demo AgroDesk — EMP000/1234 (admin), EMP001/002 employee, EMP003 manager. См. `docs/seed-users.md`.

**Критично:** не гонять новый код против локальной `agrodesk@029` и не полагаться на дефолт Vite → `:8000`.

---

## 3. Исправленные баги (сессия)

| Severity | Симптом | Причина | Исправление | Подтверждение |
|---|---|---|---|---|
| **Critical** | Массовые manager 403 (dashboard, inventory, shifts, …) | Миграция `077` материализовала `role_permissions` как `['tasks']` только | `077` + **`078_repair_tasks_section_grants`** восстанавливает grants | Full pytest 463 |
| **Critical** | E2E/login били в `:8000` / stale DB | Default proxy Playwright/Vite → 8000; 8000 отдаёт 500 на orgs | Default e2e → **8001**; helpers API → 8001 | Playwright 24 |
| **High** | `tsc -b` ~29 ошибок (router search, SharingListing, CloseShift, EquipmentLocationPicker, …) | Несовпадение optional/required search params и Zod/RHF типов | Route search types, LatLngPair ref, SharingListing fields, closeShiftSchema, point narrowing | `tsc -b` 0; build PASS |
| **High** | `test_field_plantings` / harvest: `crop_code=None` на Field | Культура живёт на planting; FieldCreate игнорирует crop | Тесты/fixtures под planting SoT; legacy crop только fallback | plantings+harvest PASS |
| **High** | Migration smoke ломал shared QA (downgrade mid-head) | Устаревшие HEAD asserts; нет restore head | try/finally + актуальные revision asserts | marketplace/org/shipment migration PASS |
| **High** | Playwright: Demo org / headings timeout | Неверный proxy; UI login flake; `/my-shift` → workspace | API-first session; UI smoke hardened; workspace tab | e2e PASS |
| **Medium** | Employee limit считал soft-deleted | Count inactive | Active-only count | telegram/employee tests |
| **Medium** | OrgSelector «Продолжить» disabled после клика | Только parent value; race | Local `pickedId` + aria-selected wait | UI login smoke PASS |
| **Medium** | Shipments heading «Отгрузки урожая» | Заголовок страницы = «Отгрузки» | E2e ожидания обновлены | shipments e2e |
| **Low** | Vitest permissions `/my-shift` | Workspace nav | Ожидания `/workspace` | Vitest 422 |

Payroll-математика **не менялась**. Целевые payroll API-тесты PASS; UI labels e2e PASS.

---

## 4. Матрица сценариев (критичные)

| Модуль | Статус |
|---|---|
| Infra migrate+seed+health QA | **PASS** |
| Fields / plantings / harvest | **PASS** |
| Payroll API + UI labels | **PASS** |
| Sharing partial / geometry | **PASS** |
| Inventory archive | **PASS** |
| Manager permissions (после 078) | **PASS** |
| Tasks / workspace redirects | **PASS** |
| Support / telegram (на QA) | **PASS** |
| Marketplace migration smoke | **PASS** |

---

## 5. Оставшиеся риски (не Critical/High)

| Severity | Заметка |
|---|---|
| **Low** | oxlint warnings (hooks deps, only-export-components) |
| **Low** | Vite HMR `ERR_ABORTED` / dynamic import при офлайн-сценариях — смягчено `gotoPath` retries + `workers:1` в CI |
| **Info** | Локальная `agrodesk@029` остаётся ловушкой, если поднять API на :8000 без migrate |

Critical/High открытых блокеров **нет**.

---

## 6. Готовность

### ГОТОВО К ПОЛНОМУ РУЧНОМУ ТЕСТИРОВАНИЮ

Ручной прогон начинать только на:

1. БД `agrodesk_qa` @ revision `078_repair_tasks_section_grants`
2. API `http://127.0.0.1:8001` с `db_up_to_date: true`
3. Frontend с `VITE_API_PROXY_TARGET=http://127.0.0.1:8001`

Чек-лист старта: `docs/qa/manual-test-start.md`.
