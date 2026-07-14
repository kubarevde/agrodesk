# АгроДеск v3.0

Веб-платформа (PWA) для управления крестьянско-фермерским хозяйством.

## Версия 3.0 — Этап 3

Новые модули: Поля, Техника (полный), Приспособления, Шеринг, Агрокалендарь, Уведомления.

| Раздел | Описание |
|--------|----------|
| `/fields` | Управление полями |
| `/equipment` | Техника и моточасы |
| `/implements` | Приспособления и навесное |
| `/sharing` | Шеринг полей, техники и приспособлений |
| `/agro-calendar` | Планирование работ |
| `/notifications` | Все уведомления |

## Запуск локально

Требования: Node.js 20+, Python 3.12+, PostgreSQL 16

### Бэкенд

**Перед запуском backend обязательно выполнить миграции:**

```bash
cd backend
alembic upgrade head
```

Полный старт:

```bash
cd backend
cp .env.example .env        # заполни пароль от PostgreSQL
pip install -r requirements.txt
pip install Pillow python-multipart
alembic upgrade head        # обязательно перед uvicorn
python -m app.seed          # начальные данные (первый раз)
uvicorn app.main:app --reload --port 8000
```

Stage 3 миграции: `002` … `008` (в т.ч. `008_agro_plan_implement_id` — столбец `agro_plan.implement_id`).

### Фронтенд

Моки отключены. Работает только живой API.

```bash
npm install
cp .env.example .env.development   # VITE_API_URL=http://localhost:8000, VITE_USE_MOCKS=false
npm run dev
```

Открой: http://localhost:5173  
Логин: `EMP000` / `1234`

Другие тестовые пользователи (пароль `1234`):

| Код    | Роль     |
|--------|----------|
| EMP000 | admin    |
| EMP001 | employee |
| EMP002 | employee |
| EMP003 | manager  |

## Как проверить Stage 3

1. Backend `:8000` + frontend `:5173`, `VITE_USE_MOCKS=false`.
2. E2E по API:

```bash
cd backend
python scripts/stage3_e2e_test.py
```

Ожидаемо: поля (5 шт., Поле №5 = 70 га), 8 единиц техники, приспособления, смены с полем/техникой/приспособлением, агрокалендарь, шеринг, уведомления, Excel-отчёты (5/3/4 листа).

3. Ручной смоук: `/fields`, `/equipment`, `/implements`, `/worktime`, `/agro-calendar`, `/sharing`, уведомления в хедере, offline (Dexie после первого online-визита).

4. Сборка: `npm run build`.

## Карта и медиа

| Библиотека | Для чего |
|---|---|
| `leaflet` + `react-leaflet` | Карта полей и техники |
| `@turf/turf` | Площадь полигонов, GeoJSON |
| `react-leaflet-draw` | Рисование контура поля |
| `yet-another-react-lightbox` | Галерея фото |
| `react-image-crop` | Кадрирование при загрузке |

Импорт стилей и настройка иконок Leaflet: `import '@/lib/maps/setup'` в компонентах карты.

## Структура

```
backend/           — FastAPI + SQLAlchemy + Alembic
src/app/routes/    — страницы (TanStack Router)
src/features/      — бизнес-логика по модулям
src/components/    — переиспользуемые компоненты
src/types/         — TypeScript типы
src/lib/           — api.ts, db.ts (Dexie), sync.ts
```

## Хостинг

Яндекс Object Storage (статика) + GitHub Actions при push в `main`.  
Секрет `VITE_API_URL` задаёт адрес API в production-сборке (`VITE_USE_MOCKS=false`).

Backend-миграции в CI: workflow `.github/workflows/backend.yml` (включается переменной `RUN_BACKEND_MIGRATIONS=true` и секретом `DATABASE_URL`).
