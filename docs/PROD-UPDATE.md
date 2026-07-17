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

---

## 0. Железобетонные правила

1. Сначала **push на GitHub**, потом деплой на VPS — никогда наоборот «только на сервере править».
2. **Никогда** не запускайте `docker compose down -v` на проде — сотрёте БД и uploads.
3. Обновление на VPS = `git pull` → **пересборка образов** → `up -d`. Без rebuild фронт/API останутся старыми.
4. Миграции БД применяются **сами** при старте контейнера `api` (`alembic upgrade head`). После деплоя всегда проверяйте `alembic current`.
5. **Один** процесс Telegram polling на один `BOT_TOKEN`. Не держите бота и в Docker на VPS, и на bothost одновременно.
6. `BOT_INTERNAL_SECRET` на VPS (`.env.production`) и на bothost **должен совпадать**.
7. Перед рискованным релизом — бэкап: `./scripts/backup_db.sh`.
8. В Git **не** коммитьте: `.env`, `.env.production`, секреты, `node_modules`, дампы БД.

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

Фронт отдельно на VPS не деплоится: он **собирается в образ nginx** при `docker compose build`.

---

## 3. Шаг 2 — залить на прод (фронт + бэк (+ бот на VPS))

Сначала должен быть выполнен **§1 (push на GitHub)**. Иначе `git pull` на сервере ничего нового не подтянет.

Делайте **на сервере**, из каталога репозитория:

```bash
ssh user@213.183.104.142
cd /opt/agrodesk

# (опционально, перед крупным релизом)
./scripts/backup_db.sh

# Главная команда
./deploy.sh
```

Скрипт делает по порядку:

1. `git pull`
2. `docker compose … build` — пересобирает **api**, **nginx (фронт)**, **bot**
3. `up -d` — пересоздаёт контейнеры, **volumes не трогает**
4. Ждёт `/health` у API
5. Печатает `alembic current`

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

После старта API сам сделает `alembic upgrade head`.  
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
| «Пропали данные» | почти всегда был `down -v` — восстанавливайте из `./backups/` |

Восстановление БД:

```bash
./scripts/restore_db.sh                  # последний дамп
./scripts/restore_db.sh backups/….sql    # конкретный; подтверждение: YES
```

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
```

---

## 10. Чеклист релиза (скопировать в задачу)

```
=== 1. GitHub (локально) ===
[ ] git status / diff — нет секретов в коммите
[ ] git add → git commit → git push origin main
[ ] на github.com виден новый коммит

=== 2. Прод (VPS) ===
[ ] ssh → cd /opt/agrodesk
[ ] (крупный релиз) ./scripts/backup_db.sh
[ ] ./deploy.sh   ИЛИ точечный build api/nginx/bot
[ ] curl /api/health + alembic current

=== 3. Бот (если bothost) ===
[ ] push в репо бота (если отдельный)
[ ] Redeploy на bothost + логи OK

=== 4. Смоук ===
[ ] логин, календарь create/edit, смена, бот /start
```

Готово. Порядок на каждый день: **push на GitHub → `./deploy.sh` на VPS** (+ Redeploy бота на bothost при необходимости).