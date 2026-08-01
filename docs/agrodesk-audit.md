# AgroDesk — техническое и продуктовое состояние проекта

Документ-отчёт для планирования нового трея и следующих итераций.  
Основан на фактическом коде и документации репозитория (не на желаемом состоянии).  
Дата среза: июль 2026. Версия продукта в API/README: **5.0**.

> **Актуализация 2026-07-30:** рудименты `VITE_USE_MOCKS` / MSW и неиспользуемый
> `exception_logging` middleware удалены; единый деплой = VPS `./deploy.sh`
> (без Yandex Object Storage). См. [tech-debt-cleanup.md](tech-debt-cleanup.md).
> Остальной текст ниже — исторический срез на дату аудита.

---

## 1. Общий обзор

### 1.1. Назначение

**АгроДеск (AgroDesk)** — веб-PWA для крестьянско-фермерских хозяйств и небольших агрокоманд. Система ведёт учёт работы в поле и на базе в разрезе **организации (tenant)**:

| Сценарий | Что даёт |
|----------|----------|
| Учёт смен | Сотрудник отмечает начало/конец работы; руководитель видит журнал и оплату |
| Поля и погода | Карта участков, контуры, прогноз по точке/центроиду поля |
| Агрокалендарь | Планы работ по датам и полям, связь со сменами |
| Парк и ремонт | Техника, навесное, наработка, ТО, журнал ремонтов, закупки |
| Склад (ТМЦ) | Остатки, приход/расход/корректировка, заправки из карточки техники |
| Оперативная сводка | Дашборд KPI, активные смены, критические остатки |
| Отчёты | Excel-выгрузки для руководства и бухгалтерии |
| Шеринг | Объявления о совместном использовании техники/полей между хозяйствами платформы |
| Поддержка | Тикеты пользователей → inbox суперадмина платформы |
| Обучение | Локальные справки (`SectionHelp`) + пошаговый гайд `/support/guide` |
| Telegram | Бот для старта/окончания смены (отдельный сервис `bot/`) |

Мультитенантность: данные жёстко привязаны к `org_id`. Платформенный контур суперадмина — отдельные JWT и API.

### 1.2. Основной стек

**Frontend** (`package.json`):

| Технология | Версия (declared) |
|------------|-------------------|
| React / React DOM | ^19.2 |
| TypeScript | ~6.0 |
| Vite | ^8.1 |
| Tailwind CSS v4 | ^4.3 (+ `@tailwindcss/vite`) |
| shadcn/ui-паттерн | CLI `shadcn` + `@base-ui/react`, компоненты в `src/components/ui/` |
| TanStack Router | ^1.170 (file-based routes) |
| TanStack Query | ^5.101 |
| Zustand | ^5 (минимально: layout sidebar) |
| Dexie.js | ^4.4 (IndexedDB + `syncQueue`) |
| PWA | `vite-plugin-pwa` ^1.3 (Workbox) |
| Axios | ^1.18 (центральный API-клиент) |
| RHF + Zod | ^7.81 / ^4.4 |
| Leaflet / react-leaflet / leaflet-draw | карты и контуры |
| Recharts, date-fns, lucide-react, framer-motion, sonner | UI/графики |
| Vitest / Playwright / oxlint | тесты и линт |

**Замечание:** в правилах проекта упоминается MSW (`VITE_USE_MOCKS`), но папки `src/mocks/` и зависимости MSW в приложении **нет** — флаг в `.env.example` фактически рудимент.

**Backend** (`backend/`):

| Технология | Детали |
|------------|--------|
| Python | 3.12 в Docker; локально возможны более новые (cp314) |
| FastAPI | 0.115, ASGI uvicorn, версия API 5.0.0 |
| SQLAlchemy 2 async + asyncpg | PostgreSQL |
| Alembic | 28 миграций, head `028_support_tickets` |
| Pydantic v2 | схемы запросов/ответов |
| JWT (python-jose) + passlib/bcrypt | org-пользователи и суперадмин |
| openpyxl | Excel-отчёты (PDF нет) |
| httpx | погода, исходящий Telegram |
| Pillow | ресайз загрузок |
| numpy / pandas / statsmodels | прогноз затрат/отгрузок |

**Сопутствующие сервисы:**

- `bot/` — aiogram 3, polling, авторизация через `BOT_INTERNAL_SECRET` → `/api/auth/bot-token`; опциональный dual-write в Google Sheets;
- Docker Compose: `db` (Postgres 16) + `api` + `bot` + `nginx` (порт **3010**).

**DevOps:**

| Канал | Что делает |
|-------|------------|
| VPS `./deploy.sh` + Compose | Основной документированный прод (`docs/PROD-UPDATE.md`) |
| GitHub Actions `deploy.yml` | Push в `main` → сборка фронта → sync в **Yandex Object Storage** |
| GitHub Actions `backend.yml` | Alembic `upgrade head` при изменении `backend/**`, только если `RUN_BACKEND_MIGRATIONS=true` |
| PWA / SW | Precache shell; API — NetworkOnly; `sw.js` / `index.html` — no-cache |

Два пути доставки фронта (VPS nginx vs Object Storage) сосуществуют; операционный «канон» в доках — VPS `:3010`.

### 1.3. Высокоуровневая архитектура

Тенантность — **плоская** (один JWT = один `org_id`). Планируемая надстройка «головная org → несколько КФХ» без смены этой модели: [org-holding.md](./org-holding.md).

```
┌─────────────┐     JWT org      ┌──────────────────┐     org_id      ┌────────────┐
│  Vite SPA   │ ───────────────► │  FastAPI /api/*  │ ───────────────► │ PostgreSQL │
│  + PWA/SW   │                  │  Org middleware  │                  └────────────┘
│  Dexie sync │                  └──────────────────┘
└─────────────┘                           │
       │                                  ├── /api/weather → Open-Meteo + MET Norway
       │                                  ├── /uploads → локальный диск
┌─────────────┐     JWT SA                │
│ Superadmin  │ ── /superadmin/api/* ─────┤
└─────────────┘                           │
┌─────────────┐     bot-token             │
│ Telegram bot│ ──────────────────────────┘
└─────────────┘
```

**Frontend-организация:**

| Слой | Путь | Роль |
|------|------|------|
| Роуты | `src/app/routes/` | TanStack file-based; дерево в `routeTree.gen.ts` |
| Домен | `src/features/<module>/` | UI, hooks, api, types модуля |
| UI | `src/components/ui/` + `shared/` + `layout/` | shadcn + общие виджеты |
| Инфра | `src/lib/` | `api.ts`, `db.ts`, `sync.ts`, permissions, maps, timezone |
| Типы | `src/types/index.ts` | общие сущности (Shift и др.) |
| Стор | `src/stores/layoutStore.ts` | UI sidebar |

Данные с сервера — через **TanStack Query** в `features/*/hooks.ts`; прямых `fetch` в фичах нет (axios-клиент `src/lib/api.ts`). Офлайн-запись смен — Dexie `syncQueue` → `flushSyncQueue` при `online` / старте.

**Backend-организация:**

| Слой | Путь |
|------|------|
| Точка входа | `backend/app/main.py` |
| Роутеры | `backend/app/routers/` |
| Модели / схемы / сервисы | `models/`, `schemas/`, `services/` |
| Auth deps | `dependencies/auth.py`, `dependencies/superadmin.py` |
| Org isolation | `middleware/org_context.py` |
| Миграции | `backend/alembic/versions/` |
| Тесты | `backend/tests/` (часто live HTTP к поднятому API) |

---

## 2. Описание функциональных модулей

Легенда статуса: **Реализовано** / **Частично** / **Планы (нет живого кода)**.

---

### 2.1. Аутентификация, организации, роли

**Статус: Реализовано**

**Назначение.** Вход в конкретное хозяйство, разделение tenant-ролей и платформенного суперадмина.

**Роли.** `employee` / `manager` / `admin` (в таблице `employees`); отдельно `superadmin` (`superadmin_users`).

**Сценарии.**

1. Пользователь выбирает организацию → логин кодом/email + пароль.
2. Админ входит и управляет людьми/доступами.
3. Суперадмин входит на `/superadmin/login` и создаёт/блокирует организации.

**Состояния.** Сессия = JWT в `localStorage` (`agrodesk_token` или `superadmin_token`) + кэш профиля для офлайн-bootstrap.

**Технически.**

| Слой | Детали |
|------|--------|
| FE роуты | `/login`, `/profile`, `/no-access`, `/superadmin/login`, `/superadmin/dashboard` |
| FE | `features/auth/*`, `features/superadmin/*`, `selectedOrg.ts` |
| API | `POST /api/auth/login`, `GET /api/auth/orgs`, `GET /api/auth/me`, permissions; `POST /api/auth/bot-token`; superadmin auth |
| БД | `organizations`, `employees`, `superadmin_users`, `access_groups` |
| Миграции | `010_multi_org`, `011_org_id_remaining`, `025_access_groups` |

**Особенности.** Org в JWT и middleware обязателен для `/api/*` (кроме auth). Refresh-token в README отмечен как **не реализован**. Права секций — в `Organization.settings.role_permissions` + access groups.

---

### 2.2. «Моя смена» и учёт рабочего времени

**Статус: Реализовано** (офлайн-запись — только смены; см. §2.11)

**Назначение.** Ежедневный учёт труда: открыть/закрыть смену, журнал по людям, ставки и ЗП.

**Роли.** Employee — «Моя смена»; manager/admin — журнал `/worktime`, ставки, ведомость.

**Сценарии.**

1. Сотрудник: «Моя смена» → начать → (поле/техника/план) → закрыть.
2. Менеджер: фильтр журнала, открытие/правка смены, выгрузка табеля.
3. Офлайн: открытие/закрытие пишется в Dexie и уходит в очередь.

**Статусы смены.** `open` | `closed`.

**Технически.**

| Слой | Детали |
|------|--------|
| FE | `/my-shift/`, `/worktime/`; `EmployeeMyShiftView`, `ManagerMyShiftView`, `WorktimePage`, `offlineShifts.ts` |
| API | `/api/shifts` (CRUD/open/close), `/api/employee-rates`, salary в reports |
| БД | `shifts`, `employee_rates`, связи с field/equipment/implement/agro_plan |
| Миграции | initial + `006_shift_field_implement`, `009_employee_rates`, `022`–`024` (связь с календарём / delete FK) |

**Особенности.** Action permissions: open/close own/others. Закрытие смены обновляет наработку техники (были баги MissingGreenlet — задокументированы и чинились в `docs/offline.md`).

---

### 2.3. Поля, контуры, погода

**Статус: Реализовано** (кадастровая автозагрузка — **не реализована**, осознанно)

**Назначение.** Справочник участков, ручной контур на карте, погода по опорной точке или центроиду.

**Роли.** Manager/admin ведут поля; employee — по доступам (часто просмотр/выбор в смене).

**Сценарии.**

1. Создать поле → площадь/культура → нарисовать контур на спутнике.
2. Смотреть погоду в календаре/карточке по точке поля.
3. Поле без координат может не попасть на карту дашборда.

**Технически.**

| Слой | Детали |
|------|--------|
| FE | `/fields/`; `FieldsPage`, `FieldsMap`, `MapView`, `lib/maps/tiles.ts` |
| API | `/api/fields`, `/api/weather` |
| БД | `locations` (`kind=field`, `polygon` JSONB, lat/lon) |
| Миграции | `004_location_coords`, `014_dictionaries_fields`, `027_field_weather_centroid` |
| Погода | Open-Meteo + MET Norway (`services/weather/`), кэш TTL |

**Особенности.** Росреестр/НСПД API в коде нет (`docs/maps.md`). Геометрия — локальный расчёт (`field_geometry.py`).

---

### 2.4. Агрокалендарь / агропланы

**Статус: Реализовано**

**Назначение.** Планы работ по полям и датам; выбор плана при открытии полевой смены; факты после смены без плана.

**Роли.** Manager/admin планируют; employee видит/выбирает план (по правам секции).

**Сценарии.**

1. Запланировать работу на неделю (поля, тип работ, даты).
2. Сотрудник привязывает план к смене → план → `done`.
3. Смена без плана → в календаре появляется `fact` (не редактируется).

**Статусы.** `planned` | `in_progress` | `done` | `cancelled`.  
`entry_kind`: `plan` | `fact` (и связанные варианты в сервисе).

**Технически.**

| Слой | Детали |
|------|--------|
| FE | `/agro-calendar/`; month/list views, day sheet, plan form |
| API | `/api/agro-plan` |
| БД | `agro_plans`, `agro_plan_fields`, `actual_shift_id`, `closed_by` |
| Миграции | `015`, `008`, `022`, `023` |

---

### 2.5. Техника, навесное, ремонт, закупки

**Статус: Реализовано**

**Назначение.** Парк машин и приспособлений, наработка/ТО, журнал ремонтов, чек-лист закупок.

**Роли.** Manager/admin; employee — по секциям.

**Сценарии.**

1. Карточка трактора: наработка, ТО, заправка ТМЦ.
2. Ремонт → чек-лист «Купить» → пункт в планировщике закупок.
3. Отметить закупку выполненной (опционально с фото).

**Технически.**

| Слой | Детали |
|------|--------|
| FE | `/equipment`, `/equipment/$id`, `/implements`, `/implements/$id`, `/maintenance`, `/purchase-planner` |
| API | `/api/equipment`, `/api/implements`, `/api/equipment-maintenance`, meter logs, `/api/purchase-planner` |
| БД | `equipment`, `implements`, `equipment_meter_logs`, `equipment_maintenance`, checklist, `purchase_planner_items` (+ images JSONB) |
| Миграции | `002`, `005`, `013`, `017`–`020` |

**Особенности.** Загрузки изображений — локальный диск (`/api/uploads/image`), не S3.

---

### 2.6. Склад / инвентарь / ТМЦ

**Статус: Реализовано**

**Назначение.** Остатки материалов и запчастей; приход, расход, корректировка; критические остатки на дашборде.

**Роли.** Manager/admin (+ action `inventory.operate` / `manage_items`); employee обычно без склада.

**Сценарии.**

1. Приход партии → расход/заправка с техники.
2. Корректировка после инвентаризации с причиной.
3. Контроль «критический остаток» на дашборде.

**Технически.**

| Слой | Детали |
|------|--------|
| FE | `/inventory/`; cards, operations, modals |
| API | `/api/inventory` |
| БД | `inventory_items`, `inventory_operations` |
| Миграции | `013`, `021`, `026` (stock repair) |

**Offline.** Запись офлайн **нет**; возможен stale-read из Dexie-кэша.

---

### 2.7. Дашборд и KPI

**Статус: Реализовано** (для manager/admin; employee обычно не видит секцию)

**Назначение.** Утренний обзор: активные смены, срочные закупки/ремонты, критический склад, финансы, карта полей, прогноз (виджет).

**Сценарии.**

1. Руководитель открывает дашборд → красные блоки → уходит в раздел.
2. «Смены без ставки» → правка ставок сотрудников.

**Технически.** `/dashboard` ← `GET /api/dashboard`; агрегации на сервере. Online-only UI при отсутствии кэша.

---

### 2.8. Отчёты

**Статус: Реализовано** (Excel only)

**Назначение.** Выгрузки для руководства/бухгалтерии: табель, ЗП, склад, отгрузки, затраты, сводки, техника, поля, сезон, ремонт, закупки.

**Роли.** Manager/admin + секция `reports`.

**Технически.** `/reports` → `/api/reports/*` (openpyxl). **PDF нет.** Нужен интернет.

Смежные модули (реализованы, кратко):

- **Затраты** `/expenses` — `expenses`;
- **Отгрузки** `/shipments` — `shipments`;
- **Прогноз** `/analytics/forecast` — statsmodels (+ optional prophet);
- **Сотрудники / ЗП** `/employees` — rates + salary preview/report;
- **Аудит** `/audit-log` — `016_audit_log`;
- **Шеринг** `/sharing` — listings/requests между org;
- **Уведомления** `/notifications` — inbox (в т.ч. ответы поддержки);
- **Настройки** `/settings` — пояс, словари, доступы, access groups;
- **Лендинг** `/`, `/landing/` — маркетинг.

---

### 2.9. Поддержка / тикеты / гайд

#### Тикеты

**Статус: Реализовано** (с осознанными ограничениями продукта)

**Назначение.** Канал «пользователь хозяйства → суперадмин платформы». Org admin/manager **не** видят inbox всего хозяйства — только свои тикеты.

**Сценарии.**

1. Сотрудник создаёт обращение (категория, приоритет, описание).
2. Суперадмин отвечает в `/superadmin/support`, меняет статус/assignee.
3. Пользователь видит ответ в переписке и badge unread.

**Статусы.** `new` → `in_progress` → `waiting_user` → `resolved` → `closed`.  
Приоритеты: `normal` | `high`.  
Категории: `bug`, `access`, `data`, `how_to`, `suggestion`, `other`.

**Технически.**

| Слой | Детали |
|------|--------|
| FE tenant | `/support`, `/support/new`, `/support/$ticketId` |
| FE SA | `/superadmin/support`, `.../$ticketId` |
| API | `/api/support/*`, `/superadmin/api/support/*` |
| БД | `support_tickets`, `support_ticket_messages` |
| Миграция | `028_support_tickets` |

**Нет в продукте:** вложения в тикетах, SLA, шаблоны ответов, org-wide inbox для admin.

#### Гайд и справка

**Статус: Реализовано** (усиленный контентный слой; не overlay-тур)

**Назначение.** Обучение: локальный FAQ (`SectionHelp` / `RoleSectionHelp`) + мастер `/support/guide` с фильтрацией по роли и `allowedSections`.

**Особенности.** Прогресс в `localStorage` (`agrodesk_system_guide_v1`, version 2, `lastSectionId`). Deep-link `?section=`. Кнопки «Открыть раздел». Nudge-баннер и карточка в поддержке.

---

### 2.10. Offline / PWA / syncQueue

**Статус: Частично реализовано** (shell + offline **write только для смен**)

**Назначение.** Работать в поле без сети: открыть приложение из иконки, вести смены, синхронизировать при появлении сети.

**Что есть.**

- Service Worker (prod build/preview), precache assets;
- Dexie DB `agrodesk` + таблица `syncQueue`;
- `flushSyncQueue` на старте и `online`;
- кэш user/permissions для bootstrap без `/me`.

**Чего нет.** Offline write для склада, полей, затрат, отчётов, тикетов. SW не активен в `npm run dev`. Вкладка браузера ≠ установленная PWA (см. `docs/offline.md`).

---

### 2.11. Интеграции (кадастр и пр.)

| Интеграция | Статус |
|------------|--------|
| Погода Open-Meteo + MET Norway | **Реализовано** |
| Росреестр / кадастр / НСПД | **Планы / отказ** — нет API-вызовов; ручной контур |
| Yandex Object Storage (фронт CI) | **Реализовано** как один из каналов деплоя |
| S3 для uploads бэка (`boto3`) | **Планы** — закомментировано в requirements |
| Google Sheets (бот) | **Частично** — опциональный dual-write в `bot/` |
| Agronomic recommendations «от погоды» | **Не реализовано** (weather AUDIT) |

---

### 2.12. Telegram-бот

**Статус: Реализовано** (отдельный сервис)

**Назначение.** Старт/статус/окончание смены из Telegram; привязка `telegram_id` к сотруднику; исходящие уведомления из API при наличии токена.

**Роли.** Сотрудники с привязанным TG; админ-команды бота — по хендлерам `bot/`.

**Технически.** `bot/` (aiogram) → `POST /api/auth/bot-token` → API смен. Деплой: Compose `bot` и/или bothost (`docs/bot-bothost.md`). Legacy `bot-main/` — не использовать (`docs/legacy-bots.md`).

---

## 3. Роли, права и модели безопасности

### 3.1. Роли

| Роль | Контур | Типичные возможности |
|------|--------|----------------------|
| **employee** | Org | «Моя смена» (неотключаемо), по умолчанию ещё `sharing`; остальные секции — если открыл админ; свои тикеты поддержки |
| **manager** | Org | По умолчанию почти все секции; смены людей, склад, отчёты; не настройки org как у admin (зависит от UI/deps) |
| **admin** | Org | Все секции; доступы, словари, timezone; нельзя «урезать» админа секциями |
| **superadmin** | Platform | Организации, inbox всех тикетов; **не** живёт в `employees` |

### 3.2. Техническая реализация

| Механизм | Где |
|----------|-----|
| JWT org (`sub`=employee id, `org_id`) | `dependencies/auth.py` |
| Org middleware (активная org) | `middleware/org_context.py` |
| `require_manager` / `require_admin` | auth deps |
| Секции меню/API | `services/permissions.py` + `Organization.settings.role_permissions` |
| Actions (смены/склад/закупки) | `services/action_permissions.py` + access groups |
| FE меню | `allowedSections` / permissions hooks + кэш localStorage |
| Superadmin JWT | `dependencies/superadmin.py`, отдельный axios |

### 3.3. Модель организаций

- Таблица `organizations` (name, slug, plan/trial, settings JSONB, max_employees…).
- На логине: `GET /api/auth/orgs` → выбор → `selected_org` в localStorage → `org_id` в теле логина → JWT.
- Все tenant-запросы фильтруются по `org_id` из токена/middleware.
- Шеринг — межорганизационный, но сущности листингов всё равно org-scoped у владельца.

### 3.4. Что закреплено кодом vs «логически ожидается»

| Ограничение | В коде? |
|-------------|---------|
| Изоляция данных по org | Да |
| Author-only тикеты у tenant-пользователей | Да |
| Нет org-wide support inbox у admin/manager | Да (by design) |
| Employee не лишить `my-shift` | Да (`EMPLOYEE_LOCKED_SECTIONS`) |
| Refresh token / revoke session server-side | Нет |
| Вложения в тикетах | Нет |
| SLA / эскалации поддержки | Нет |
| Единый деплой-канал фронта | Нет (VPS и Object Storage параллельно) |

---

## 4. Инфраструктура, сборка, тесты

### 4.1. Команды

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Vite :5173 (proxy `/api` → :8000) |
| `npm run dev:api` | Backend bootstrap (PowerShell) |
| `npm run build` | `tsc -b && vite build` |
| `npm run preview` | Prod-сборка + SW |
| `npm test` | Vitest (`src/**/*.test.ts`) |
| `npm run test:e2e` | Playwright (`e2e/`) |
| `npm run test:api` | `pytest` в backend |
| `npm run lint` | oxlint |
| `npm run db:migrate` / `db:seed` | Alembic / seed |
| `./deploy.sh` | VPS Compose rebuild |

Backend локально: uvicorn на `:8000`, docs `/docs`.

### 4.2. Конфиги и окружение

- Vite / PWA: `vite.config.ts` (`VITE_BASE_PATH`, tiles env, Workbox NetworkOnly для API).
- Env-примеры: `.env.example`, `.env.production.example`, `backend/.env.example`, `bot/.env.example`.
- Ключевые FE: `VITE_API_URL`, map tiles, (рудимент) `VITE_USE_MOCKS`.
- Ключевые BE/prod: `DATABASE_URL`, `SECRET_KEY`, `BOT_INTERNAL_SECRET`, `TELEGRAM_BOT_TOKEN`, `SUPERADMIN_*`, `ALLOWED_ORIGINS`.

### 4.3. Тестирование

**Frontend (Vitest):** utils, permissions, sync flush, auth offline, guide, fields geometry, weather, forecast helpers, purchase-planner, audit labels, agro-calendar fixes, inventory, landing nav, settings sections, map tiles.  
**E2E:** Playwright `e2e/shifts.spec.ts` (+ helpers); ручные чеклисты `docs/e2e-checklist.md`, `docs/qa-package-fixes.md`.  
**Backend (pytest):** ~32 модуля — shifts, permissions, agro-plan, purchase planner, support, inventory, repair, weather, analytics, audit, access groups… Многие тесты требуют **живой** API + seed Demo.

**В CI автоматически:** сборка фронта (deploy.yml).  
**Не в CI по умолчанию:** Vitest, Playwright, полный pytest, oxlint. Backend migrations — opt-in через variable.

### 4.4. CI/CD

| Workflow | Триггер | Действие |
|----------|---------|----------|
| `deploy.yml` | push `main` | `npm ci` → build → sync в Yandex Object Storage |
| `backend.yml` | push `main` (backend) / manual | alembic upgrade, если `RUN_BACKEND_MIGRATIONS=true` |

Секреты (имена): `VITE_API_URL`, `YC_ACCESS_KEY_ID`, `YC_SECRET_ACCESS_KEY`, `YC_BUCKET_NAME`, `DATABASE_URL`.

Прод-эксплуатация VPS: `docs/PROD-UPDATE.md` (git pull → `deploy.sh`, без `compose down -v`, бэкапы `scripts/backup_db.sh`).

---

## 5. Known issues, долги и ограничения

### 5.1. Известные / задокументированные проблемы

- Закрытие смены и meter logs ранее давали 500 (`MissingGreenlet`) — починено, но зона чувствительна (`docs/offline.md`).
- Offline write вне смен **не сделан**; очередь может «зависнуть» при ошибках API — есть ручной retry в шапке.
- SW и PWA-кэш: ошибки деплоя при агрессивном cache `sw.js`/`index.html` (правила в nginx и Actions).
- Карты зависят от внешних тайлов (Esri/OSM); квоты/стабильность — зона риска; MapTiler рекомендован в доках.
- Контур поля — ручной UX (leaflet-draw); кадастр не подтянется «по номеру».
- MSW/mocks в правилах проекта не соответствуют репо.
- Refresh JWT нет — долгие сессии = длинный TTL (`JWT_EXPIRE_MINUTES` / 7d по умолчанию в конфиге).
- Uploads только на диск контейнера (volume) — нет облака, миграция между хостами ручная.
- Два канала фронта (S3 vs VPS) могут разъехаться по версии, если обновляют только один.

### 5.2. Осознанные ограничения продукта

- Нет overlay/coachmark-тура — только мастер-экран гайда и `SectionHelp`.
- Прогресс гайда только в браузере, не на сервере.
- Поддержка: нет вложений, SLA, шаблонов; нет org-wide inbox для admin/manager.
- Отчёты только Excel, не PDF.
- Кадастр не интегрирован (юридически/технически зафиксировано в `docs/maps.md`).
- Tenant support ≠ внутренняя helpdesk хозяйства.

### 5.3. Технический долг / зоны для нового трея

| Зона | Почему важно |
|------|----------------|
| Offline за пределами смен | Реальный полевой UX (склад, тикеты, фото) |
| Единый пайплайн деплоя + тесты в CI | Сейчас CI не гоняет unit/e2e/api |
| Cloud uploads | Масштабирование и бэкапы медиа |
| Support 2.0 | Вложения, org-inbox?, SLA, шаблоны |
| Session security | Refresh / logout-all / короче TTL |
| Убрать рудименты | `VITE_USE_MOCKS`, неиспользуемый `exception_logging` middleware |
| Weather → агросоветы | Явно «not implemented» в weather AUDIT |
| Согласованность FE rules vs код | MSW, «только Query hooks» vs редкие отклонения |

Сложные, но рабочие участки (расширять осторожно): syncQueue + remap local shift ids; agro-plan ↔ shift lifecycle; permissions (role + access group + actions); meter logs при close shift.

---

## 6. Сводная таблица «модуль → статус»

| Модуль | Статус | Заметки |
|--------|--------|---------|
| Аутентификация / роли / org | Реализовано | Multi-org JWT; refresh нет; SA отдельный контур |
| Моя смена / рабочее время | Реализовано | Offline write смен; ставки и ЗП связаны |
| Поля и погода | Реализовано | Ручной контур; Open-Meteo/MET; кадастра нет |
| Агрокалендарь | Реализовано | plan/fact, связь со сменами |
| Техника / навесное / ремонт / закупки | Реализовано | Локальные uploads; планировщик с фото |
| Склад / ТМЦ | Реализовано | Online write; критические остатки на дашборде |
| Дашборд и KPI | Реализовано | В основном manager/admin; online-centric |
| Отчёты | Реализовано | Excel; PDF нет |
| Затраты / отгрузки / прогноз | Реализовано | Прогноз statsmodels; агросоветы от погоды нет |
| Сотрудники / доступы / аудит | Реализовано | Access groups + role_permissions |
| Шеринг | Реализовано | Межorg объявления/заявки |
| Поддержка / тикеты | Реализовано | Author-only; SA inbox; без вложений/SLA |
| Гайд / справка | Реализовано | Мастер + SectionHelp; прогресс в localStorage |
| Offline / PWA / syncQueue | Частично | Shell + смены; остальное online/cache-read |
| Интеграции (кадастр и т.п.) | Планы / нет | Кадастр осознанно отсутствует |
| Telegram-бот | Реализовано | `bot/` + bot-token API; bothost/Compose |
| **Маркетплейс (витрина)** | **Реализовано (MVP, 2026)** | Доска объявлений; без эквайринга; склад = snapshot-импорт; см. `docs/marketplace.md` |
| Object Storage uploads бэка | Планы | boto3 в requirements закомментирован |
| MSW-моки фронта | Планы / рудимент | Флаг есть, кода моков нет |

---

## Приложение A. Карта основных роутов фронта

`/`, `/landing/`, `/login`, `/dashboard`, `/my-shift/`, `/worktime/`, `/agro-calendar/`, `/fields/`, `/equipment/`, `/equipment/$id`, `/implements/`, `/implements/$id`, `/maintenance/`, `/purchase-planner/`, `/inventory/`, `/shipments/`, `/expenses/`, `/analytics/forecast/`, `/reports/`, `/employees/`, `/audit-log/`, `/settings/`, `/sharing/`, `/notifications/`, `/profile/`, `/no-access/`, `/support/`, `/support/new`, `/support/$ticketId`, `/support/guide`, `/seller-market/`, `/market/`, `/superadmin/login`, `/superadmin/dashboard`, `/superadmin/marketplace/`, `/superadmin/support/`, `/superadmin/support/$ticketId`.

## Приложение B. Документы, связанные с этим отчётом

| Документ | Тема |
|----------|------|
| `README.md` | Быстрый старт, env, архитектура |
| `docs/marketplace.md` | Маркетплейс MVP: витрина, кабинет, границы, фаза 2 |
| `docs/PROD-UPDATE.md` | Операции на VPS |
| `docs/DEPLOY.md` | Первичный деплой |
| `docs/offline.md` | Границы PWA/offline |
| `docs/maps.md` | Тайлы и кадастр |
| `docs/bot-bothost.md` | Бот на bothost |
| `backend/app/services/weather/AUDIT.md` | Погодные источники |

---

*Конец отчёта. При расхождении с кодом приоритет у кода и миграций Alembic.*
