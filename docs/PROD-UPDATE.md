# Прод: как обновлять и запускать АгроДеск

Единый гайд. Держите этот файл под рукой — сюда входят **фронт, бэк и бот**.

## Порядок всегда такой

```
1. Локально → залить код на GitHub
2. VPS      → подтянуть с GitHub и перезапустить прод
3. (если нужно) bothost → Redeploy бота
```

Без шага 1 сервер при `git pull` получит старый код. Без шага 2 на проде останется старая сборка, даже если GitHub уже обновлён.

| | URL / место |
|---|---|
| GitHub | https://github.com/kubarevde/agrodesk |
| Ветка прод | `main` |
| Прод UI + API | http://213.183.104.142:3010 |
| Health | http://213.183.104.142:3010/api/health |
| Код на VPS | `/opt/agrodesk` |
| Секреты VPS | `/opt/agrodesk/.env.production` (не в Git) |
| Бот | либо контейнер `agrodesk_bot` на VPS, либо **bothost.ru** |

Подробности первого деплоя: [DEPLOY.md](DEPLOY.md). Бот на bothost: [bot-bothost.md](bot-bothost.md).  
Если бот пишет про связь с API: [bot-api-diagnostics.md](bot-api-diagnostics.md).

---

## 0. Железобетонные правила

1. Сначала **push на GitHub** и дождитесь зелёного CI, потом деплой на VPS — никогда наоборот «только на сервере править».
2. **Никогда** не запускайте `docker compose down -v` на проде — сотрёте БД и uploads.
3. Обновление на VPS = `git pull` → **пересборка образов** → `up -d`. Без rebuild фронт/API останутся старыми.
4. Миграции БД **обязательны**: `./deploy.sh` вызывает `alembic upgrade head`; то же при старте `api`. После деплоя проверяйте `alembic current`.
5. **Один** процесс Telegram polling на один `BOT_TOKEN`. Не держите бота и в Docker на VPS, и на bothost одновременно.
6. `BOT_INTERNAL_SECRET` на VPS (`.env.production`) и на bothost **должен совпадать**.
7. Перед рискованным релизом — бэкап БД и uploads: `./scripts/backup_db.sh` и `./scripts/backup_uploads.sh` (или `./scripts/run_nightly_backup.sh`).
8. В Git **не** коммитьте: `.env`, `.env.production`, секреты, `node_modules`, дампы БД, архивы `backups/`.
9. Фронт отдаётся только с VPS (nginx). **Object Storage / S3 / Yandex Cloud для статики не используются.** Uploads — volume `uploads_data` на диске VPS (`/api/uploads`).
10. CI (GitHub Actions) только валидирует PR/push; на прод **не** деплоит. После зелёного CI: `ssh` → `/opt/agrodesk` → `./deploy.sh`.


---

## 1. Шаг 1 — залить проект на GitHub (локально)

Делайте **на своём ПК**, в корне репозитория (`agroDesk`).

### PowerShell (Windows)

```powershell
cd C:\Users\dmitriy.kubarev\Desktop\Agrodesk\agroDesk

# Что изменилось
git status
git diff

# Подтянуть remote на всякий случай (если кто-то ещё пушил)
git pull origin main

# Добавить нужные файлы (не секреты!)
git add -A
git status   # ещё раз глянуть: нет ли .env / ключей

# Коммит
git commit -m "Кратко: что и зачем изменили"

# Залить на GitHub
git push origin main
```

### Проверка, что GitHub обновился

```powershell
git status
# ожидайте: "Your branch is up to date with 'origin/main'" и чистое дерево
```

В браузере: https://github.com/kubarevde/agrodesk — последний коммит ваш.

### Если push отклонили (diverged)

```powershell
git pull --rebase origin main
git push origin main
```

Конфликты правите локально, потом снова `git push`.

### Отдельный репозиторий бота (bothost)

Если bothost смотрит **не** в монорепу, а в отдельный репо с содержимым `bot/`:

1. Скопируйте/синхронизируйте изменения из `bot/` в тот репозиторий.
2. Там тоже: `git add` → `commit` → `push`.
3. После деплоя API на VPS — Redeploy на bothost (§5).

---

## 2. Что где крутится

```
Internet → :3010  nginx (фронт SPA + proxy /api)
                ├─ /           → статика React (образ nginx)
                └─ /api/       → api:8000 (FastAPI)

api → PostgreSQL (volume postgres_data)
bot → HTTP → API  (БД боту не нужна)
```

| Сервис Compose | Контейнер | Что это |
|----------------|-----------|---------|
| `nginx` | `agrodesk_nginx` | **Фронтенд** (сборка Vite внутри Dockerfile) |
| `api` | `agrodesk_api` | **Бэкенд** + alembic при старте |
| `db` | `agrodesk_db` | PostgreSQL |
| `bot` | `agrodesk_bot` | Telegram-бот (если не на bothost) |

Фронт отдельно никуда не выгружается: он **собирается в образ nginx** при `docker compose build` на этой VPS.

После push в `main` дождитесь **зелёного CI** в GitHub (lint + Vitest; backend-тесты — если меняли API), затем деплой вручную ниже. CI на VPS не ходит.

---

## 3. Шаг 2 — залить на прод (фронт + бэк (+ бот на VPS))

Сначала должен быть выполнен **§1 (push на GitHub)** и зелёный CI. Иначе `git pull` на сервере ничего нового не подтянет / выкатите непроверенный код.

Делайте **на сервере**, из каталога репозитория:

```bash
ssh user@213.183.104.142
cd /opt/agrodesk

# (опционально, перед крупным релизом)
./scripts/backup_db.sh
./scripts/backup_uploads.sh

# Главная команда
./deploy.sh
```

Скрипт делает по порядку:

1. `git pull`
2. `docker compose … build` — пересобирает **api**, **nginx (фронт)**, **bot**
3. `up -d` — пересоздаёт контейнеры, **volumes не трогает**
4. Ждёт `/health` у API
5. `alembic upgrade head` (обязательно; при ошибке деплой падает)
6. Печатает `alembic current`

Эквивалент вручную:

```bash
cd /opt/agrodesk
git pull --ff-only
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d --remove-orphans
curl -sf http://127.0.0.1:3010/api/health
docker exec agrodesk_api alembic current
```

### Если бот на bothost (не в Docker)

На VPS поднимайте только БД + API + фронт:

```bash
cd /opt/agrodesk
git pull --ff-only
docker compose --env-file .env.production build api nginx
docker compose --env-file .env.production up -d db api nginx
```

Бот обновляйте отдельно — см. §5.

---

## 4. Точечные обновления

### Только бэкенд (роуты, миграции, багфиксы API)

```bash
cd /opt/agrodesk
git pull --ff-only
docker compose --env-file .env.production build api
docker compose --env-file .env.production up -d api
# дождитесь health, затем:
docker exec agrodesk_api alembic current
docker logs --tail=80 agrodesk_api
```

После старта API сам сделает `alembic upgrade head` (и `./deploy.sh` тоже вызывает его явно).
Если в логах ошибка про таблицу (например `agro_plan_fields`) — миграции не применились; смотрите `alembic history` / `alembic current`.

### Только фронтенд (UI)

```bash
cd /opt/agrodesk
git pull --ff-only
docker compose --env-file .env.production build nginx
docker compose --env-file .env.production up -d nginx
```

В браузере: жёсткое обновление (Ctrl+F5) или очистка SW/кэша PWA, если видите старый UI.

### Только бот на VPS (Docker)

```bash
cd /opt/agrodesk
git pull --ff-only
docker compose --env-file .env.production build bot
docker compose --env-file .env.production up -d bot
docker logs --tail=50 agrodesk_bot
```

---

## 5. Бот на bothost.ru

Бот **не ходит в PostgreSQL** — только в публичный API.

### Env в панели bothost (обязательно)

```env
AGRODESK_ENV=production
BOT_TOKEN=<токен от @BotFather>
API_BASE_URL=http://213.183.104.142:3010
BOT_INTERNAL_SECRET=<ТОЧНО тот же, что в .env.production на VPS>
BOT_RUN_MODE=polling
```

`API_BASE_URL` — URL, доступный **из интернета** (не `localhost`, не `http://api:8000`).

### Обновление кода бота

1. Запушьте изменения в Git-репозиторий, который подключён к bothost  
   (отдельное репо с содержимым `bot/` **или** монорепа + Dockerfile `bot/Dockerfile`).
2. В панели bothost: **Redeploy / Rebuild** (или автодеплой по push).
3. Проверьте логи:
   - `Starting AgroDesk bot env=production`
   - нет `Missing required env var …`
   - нет бесконечных 401/403 к API

### После смены секрета на VPS

1. Обновите `BOT_INTERNAL_SECRET` в `.env.production`
2. `docker compose --env-file .env.production up -d api` (перечитать env)
3. Тот же секрет вставьте в bothost → Redeploy бота

### Нельзя

- Запускать `agrodesk_bot` в Docker **и** бота на bothost с одним `BOT_TOKEN`
- Класть PostgreSQL credentials в bothost — они не нужны

---

## 6. Проверка после любого обновления

С VPS:

```bash
docker compose --env-file .env.production ps
curl -sf http://127.0.0.1:3010/api/health && echo
docker exec agrodesk_api alembic current
docker logs --tail=50 agrodesk_api
```

Снаружи / в браузере:

- [ ] http://213.183.104.142:3010 — открывается UI
- [ ] http://213.183.104.142:3010/api/health — OK, желательно `"db_up_to_date": true`
- [ ] Логин менеджера / суперадмина
- [ ] Сценарий из релиза (создать задачу календаря, смена, и т.д.)
- [ ] Telegram: `/start` у бота, открытие/закрытие смены

Логи:

```bash
docker logs -f agrodesk_api
docker logs -f agrodesk_nginx
docker logs -f agrodesk_bot   # только если бот на VPS
```

---

## 7. Первый запуск с нуля (кратко)

Только если сервер ещё пустой:

```bash
sudo mkdir -p /opt/agrodesk && sudo chown "$USER":"$USER" /opt/agrodesk
cd /opt/agrodesk
git clone <URL_РЕПО> .
cp .env.production.example .env.production
nano .env.production   # SECRET_KEY, BOT_INTERNAL_SECRET, BOT_TOKEN, POSTGRES_PASSWORD, …

chmod +x deploy.sh scripts/*.sh
./deploy.sh
```

Дальше всегда: **§1 push → §3 deploy**.

---

## 8. Частые поломки

| Симптом | Что сделать |
|---------|-------------|
| UI старый после деплоя | `build nginx` + `up -d nginx`, Ctrl+F5 / сброс SW |
| `/api/…` 502 | `docker logs agrodesk_api`, дождаться healthcheck |
| 500 и в логах `agro_plan_fields` / undefined table | миграции: `docker exec agrodesk_api alembic upgrade head` и `restart api` |
| Create задачи 500, edit OK | обычно старый код API или миграция `015` не на head — полный rebuild `api` |
| Бот: `Missing … BOT_INTERNAL_SECRET` | env не попал в контейнер bothost / не сделали Redeploy |
| Бот: 403 secret mismatch | разные секреты VPS ↔ bothost |
| Бот молчит | второй polling (VPS+bothost), или API недоступен с bothost: `curl $API_BASE_URL/api/health` |
| Белый экран | `docker logs agrodesk_nginx`, пересобрать `nginx` |
| «Пропали данные» | почти всегда был `down -v` — восстанавливайте из `./backups/` (БД + uploads) |

---

## 8a. Бэкапы и восстановление (БД + uploads)

Файлы (фото техники, чеки) лежат в Docker volume `uploads_data` → `/app/uploads` в `agrodesk_api`. Облако не используется.

### Разовый бэкап

```bash
cd /opt/agrodesk
./scripts/backup_db.sh          # backups/agrodesk_YYYYMMDD_HHMMSS.sql
./scripts/backup_uploads.sh     # backups/uploads_YYYYMMDD_HHMMSS.tar.gz
```

### Расписание (ежедневно 03:15)

```bash
chmod +x scripts/*.sh
sudo ./scripts/install_backup_cron.sh
tail -f /var/log/agrodesk-backup.log
```

Или systemd: скопировать `scripts/systemd/agrodesk-backup.*` → `systemctl enable --now agrodesk-backup.timer`.

### Объём и частота

```bash
docker exec agrodesk_api du -sh /app/uploads
docker exec agrodesk_api du -sh /app/uploads/marketplace
docker exec agrodesk_api find /app/uploads -type f | wc -l
```

Типичный прирост без витрины — единицы–десятки МБ в неделю. **Маркетплейс** (до 8 фото на объявление, JPEG после Pillow ≤ ~1–2 МБ) может ускорить рост: следите за `/app/uploads/marketplace`.

- **Ежедневный** бэкап (`KEEP_COUNT=14` по умолчанию) остаётся достаточным — не нужен почасовой.
- Когда `du -sh /app/uploads` приближается к сотням МБ — обязательно `BACKUP_OFFSITE_TARGET` и запас места ≈ `14 × размер дерева uploads`.
- Скрипт `backup_uploads.sh` печатает отдельно размер каталога `marketplace`.

### Копия на второй диск / другой сервер

В `.env.production`:

```bash
BACKUP_OFFSITE_TARGET=/mnt/usb-backups/agrodesk
# или: BACKUP_OFFSITE_TARGET=user@other-host:/var/backups/agrodesk
```

`run_nightly_backup.sh` сам вызовет `sync_backups_offsite.sh` (rsync). Без переменной шаг пропускается.

### Восстановление БД

```bash
cd /opt/agrodesk
./scripts/restore_db.sh                       # последний .sql
./scripts/restore_db.sh backups/agrodesk_….sql
# введите YES
```

### Восстановление uploads

```bash
cd /opt/agrodesk
./scripts/restore_uploads.sh                            # последний .tar.gz
./scripts/restore_uploads.sh backups/uploads_….tar.gz
# введите YES
docker compose --env-file .env.production restart api
```

Порядок после `down -v` / потери volume: поднять стек → restore БД (если нужно) → restore uploads → `restart api` → проверить фото в UI.

Подробности также в [DEPLOY.md](DEPLOY.md#бэкап-и-восстановление).

---

## 9. Шпаргалка команд

```bash
# --- Локально (ПК) ---
git add -A && git commit -m "…" && git push origin main

# --- На VPS ---
# Полный апдейт
cd /opt/agrodesk && ./deploy.sh

# Статус
docker compose --env-file .env.production ps

# Миграции
docker exec agrodesk_api alembic current
docker exec agrodesk_api alembic upgrade head

# Перезапуск без пересборки
docker compose --env-file .env.production restart api nginx

# Остановка без удаления данных
docker compose --env-file .env.production down

# Бэкап
./scripts/backup_db.sh
./scripts/backup_uploads.sh
# или всё сразу (+ offsite, если задан BACKUP_OFFSITE_TARGET):
./scripts/run_nightly_backup.sh
```

---

## 10. Миграции 025 / 026 (права + ремонт остатков ТМЦ)

Прод до этого релиза: `024_shift_delete_fk`. После деплоя API применит:

| Ревизия | Что делает | Удаляет данные? |
|---------|------------|-----------------|
| `025_access_groups` | Таблица `access_groups`, `employees.access_group_id`, seed группы «Снабженец» | **Нет** (только additive) |
| `026_inventory_stock_repair` | Для позиций без `purpose=opening` вставляет недостающий opening и **пересчитывает** `stock_after` / `current_stock` | **Нет** пользовательских операций; только ремонт ledger |

`026` — **ремонт**, не wipe: история приходов/расходов сохраняется. Может измениться отображаемый остаток, если раньше он расходился с журналом.

**Обязательно перед upgrade на проде:**

```bash
cd /opt/agrodesk
./scripts/backup_db.sh   # дамп в каталог бэкапов скрипта (см. scripts/backup_db.sh)
```

После деплоя:

```bash
curl -s http://127.0.0.1:3010/api/health   # db_revision → 026_inventory_stock_repair
docker exec agrodesk_api alembic current
# Смоук: ТМЦ список + одна позиция (история операций на месте), закупки, настройки → Доступы
```

---

## 11. Чеклист релиза (скопировать в задачу)

```
=== 1. GitHub (локально) ===
[ ] git status / diff — нет секретов в коммите
[ ] git add → git commit → git push origin main
[ ] на github.com виден новый коммит

=== 2. Прод (VPS) ===
[ ] ssh → cd /opt/agrodesk
[ ] (обязательно для 025/026) ./scripts/backup_db.sh
[ ] ./deploy.sh   ИЛИ точечный build api/nginx/bot
[ ] curl /api/health → db_revision = 026_inventory_stock_repair
[ ] alembic current

=== 3. Бот (если bothost) ===
[ ] push в репо бота (если отдельный)
[ ] Redeploy на bothost + логи OK

=== 4. Смоук ===
[ ] логин admin/manager/employee/снабженец
[ ] смены (свои), закупки (без ложных 403), ТМЦ приход/расход/корректировка
[ ] календарь + погода, настройки/доступы (mobile 375), история
```

Готово. Порядок на каждый день: **push на GitHub → `./deploy.sh` на VPS** (+ Redeploy бота на bothost при необходимости).