# Rollback / safety net: harvest ↔ ТМЦ ↔ заявки

Страховочная точка перед (и во время) доработок единой логики урожая, склада и заявок на отгрузку.

Связанные материалы: [inventory-harvest-audit.md](./inventory-harvest-audit.md), [harvest-tmc-link.md](./harvest-tmc-link.md), [shipments.md](./shipments.md), [shipment-requests.md](./shipment-requests.md), [PROD-UPDATE.md](./PROD-UPDATE.md).

---

## 1. Референсная версия (сейф)

| Артефакт | Значение |
|----------|----------|
| **Git tag** | `harvest-unify-baseline` |
| **Смысл тега** | Последний **закоммиченный** снимок `main` до фиксации/слияния дальнейших экспериментов по harvest-unify. Рабочее дерево может содержать WIP — тег указывает на commit, не на dirty tree. |
| **Alembic head (код в WIP на момент страховки)** | `034_request_kind_domains` |
| **Alembic на чистом теге** | Смотрите `backend/alembic/versions` в checkout тега — может быть **ниже** `034`, если миграции 030–034 ещё не в том коммите. Перед откатом кода **обязателен** совместимый дамп БД. |

### Стабильные модули на этой точке

Считаются рабочими и не должны ломаться откатом «поверх» экспериментов:

- Смены / рабочее время  
- Поля (`locations`) и агрокалендарь  
- Склад ТМЦ (приход/расход/корректировка, заправки)  
- Отгрузки урожая (`shipments`) как отдельный домен  
- Заявки на отгрузку (`shipment_requests`) + feature-flag  
- Отчёты Excel (отдельные endpoints) и KPI дашборда по `shipments`  
- Прогноз (income из `shipments`, не из `inventory_operations`)

### Как поставить тег (если ещё нет)

```bash
git tag -a harvest-unify-baseline -m "Baseline before harvest/ТМЦ/заявки unify experiments"
git push origin harvest-unify-baseline   # когда нужно на remote
```

Проверка: `git show harvest-unify-baseline --no-patch`

---

## 2. Бэкап БД перед изменениями

### 2.1 Скрипты

| Скрипт | Назначение |
|--------|------------|
| `scripts/backup_db_harvest_unify.sh` | Именованный полный `pg_dump` → `backups/backup_harvest_unify_YYYYMMDD_HHMM.sql.gz` (+ `.meta.txt`) |
| `scripts/backup_db_harvest_unify.ps1` | То же для Windows / локального Postgres без Docker |
| `scripts/backup_db.sh` | Обычный ночной/VPS дамп (`agrodesk_*.sql`) — **не заменяет** именованный harvest-бэкап перед рискованными миграциями |

**Когда:** **перед** любым `alembic upgrade`, затрагивающим harvest / inventory / shipment_requests.

**Версии:** целевой Postgres проекта — **16**; клиент `pg_dump` должен быть совместим (желательно та же major).

### 2.2 Команды

```bash
# VPS / Linux (Docker DB agrodesk_db или DATABASE_URL)
chmod +x scripts/*.sh
./scripts/backup_db_harvest_unify.sh

# Windows (локальный Postgres)
.\scripts\backup_db_harvest_unify.ps1
```

Дампы лежат в `backups/` (каталог в `.gitignore` — в git не коммитить).

---

## 3. Restore БД

### 3.1 Скрипт

`scripts/restore_db_from_backup.sh <path-to-dump.sql[.gz]>`

Последовательность:

1. Подтверждение `YES` (обязательно).  
2. Опционально `docker stop agrodesk_api` (`STOP_API=1` по умолчанию).  
3. `psql` / `docker exec … psql` с `ON_ERROR_STOP`.  
4. Подъём API и проверка health.

Альтернатива на VPS без gzip-обёртки: `./scripts/restore_db.sh backups/agrodesk_….sql` (тоже требует `YES`).

### 3.2 Prod

- Restore на **prod только вручную**, с явным подтверждением и пониманием:  
  **все данные после момента дампа будут потеряны** (это ожидаемо).  
- После restore сверьте `alembic current` со схемой в дампе / тегом кода.  
- При рассинхроне: либо поднять код на совместимый tag, либо осторожно `alembic upgrade/downgrade` на **копии**, не вслепую на проде.

```bash
./scripts/restore_db_from_backup.sh backups/backup_harvest_unify_YYYYMMDD_HHMM.sql.gz
```

---

## 4. Правила миграций Alembic (harvest / ТМЦ / заявки)

### 4.1 Разрешено в одной фазе

- `ADD COLUMN` (nullable или с безопасным `server_default`)  
- `ADD TABLE`, индексы, FK с `ON DELETE` осознанным  
- Seed справочников (`INSERT … WHERE NOT EXISTS`)  
- Backfill данных без удаления старых строк  

### 4.2 Запрещено «сразу»

- `DROP COLUMN` / `DROP TABLE` с боевыми данными  
- Необратимый rewrite без дампа  
- Downgrade, который дропает колонки с данными  

Сначала deprecate (код перестаёт писать), через несколько релизов — отдельная миграция удаления.

### 4.3 Downgrade обязателен

Каждая новая миграция по этой теме должна иметь рабочий `downgrade()`.  
Перед staging/prod:

```bash
./scripts/backup_db_harvest_unify.sh
./scripts/alembic_migration_smoke.sh    # upgrade → downgrade -1 → upgrade
# при цепочке: ./scripts/alembic_migration_smoke.sh 2
```

### 4.4 Деплой с бэкапом

```bash
./scripts/deploy_with_db_backup.sh
# вместо голого ./deploy.sh при релизах harvest-unify
```

Скрипт сначала делает именованный дамп, логирует alembic/git, затем вызывает `deploy.sh`.

---

## 5. Частичный откат без restore БД

### 5.1 Feature-flags

| Флаг | Где | Эффект |
|------|-----|--------|
| `shipment_requests_enabled` | `Organization.settings` JSON (`false` выключает) | API заявок 403, права `shipment_requests.*` снимаются, пункты меню скрыты. **Склад и `shipments` продолжают работать.** |
| UI / настройки | Настройки → часовой пояс (переключатель модуля заявок) | То же через админа org |

Логический «стоп rollout» заявок:

```json
{ "shipment_requests_enabled": false }
```

Отдельного флага «скрыть harvest-SKU» пока нет — при необходимости временно не заводить позиции `category=harvest` и фильтровать заявки `kind=harvest` в UI (без смены схемы).

### 5.2 Git

**Откат кода к сейфу (локально / hotfix-ветка):**

```bash
git fetch --tags
git switch -c rollback/harvest-unify harvest-unify-baseline
# или: git checkout harvest-unify-baseline
```

**Revert последних коммитов harvest (если уже в main):**

```bash
git revert --no-edit <oldest_bad>^..<newest_bad>
```

**Фронт отдельно от backend:** допустим только если **не** было несовместимых миграций схемы. Если БД уже на `033`/`034`, а код откатился на тег без этих ревизий — API упадёт или будет врать: нужен **restore дампа** или `alembic downgrade` на совместимую ревизию **после** бэкапа.

---

## 6. Чек-лист быстрого отката

### A. Только выключить заявки (данные на месте)

1. [ ] `shipment_requests_enabled: false` в settings org  
2. [ ] Проверить меню / API 403 на `/api/shipment-requests`  
3. [ ] Склад и «Отгрузки урожая» открываются  

### B. Откат кода + БД к сейфу

1. [ ] Найти дамп `backups/backup_harvest_unify_*.sql.gz` (или nightly `agrodesk_*.sql`)  
2. [ ] `./scripts/restore_db_from_backup.sh <dump>` → `YES`  
3. [ ] Checkout / deploy тега `harvest-unify-baseline` (или revert)  
4. [ ] `alembic current` согласован с кодом  
5. [ ] Smoke: login, смены, склад, shipments, (заявки если включены)  
6. [ ] pytest / Vitest по затронутым модулям  

### C. Перед новым экспериментом

1. [ ] `git tag` на месте (`harvest-unify-baseline`)  
2. [ ] `./scripts/backup_db_harvest_unify.sh` (или `.ps1`)  
3. [ ] Миграции только additive + downgrade  
4. [ ] `./scripts/alembic_migration_smoke.sh` на копии БД  
5. [ ] На prod: `./scripts/deploy_with_db_backup.sh`  

---

## 7. Проверка страховочной системы

| Проверка | Статус (заполнить по факту) |
|----------|------------------------------|
| Тег `harvest-unify-baseline` создан | да / нет (см. `git tag -l`) |
| Скрипты backup/restore/smoke/deploy wrapper в `scripts/` | да |
| Локальный/dev пробный `backup_db_harvest_unify` | см. дату ниже |
| Полный restore на staging | **вручную на VPS** (Docker); на Windows-dev без Docker — backup через `.ps1` / `DATABASE_URL` |
| e2e полный цикл restore | не блокирует мерж страховки; выполнить на staging перед прод-экспериментом |

**Дата фиксации документации страховки:** 2026-07-30  

**Git tag:** `harvest-unify-baseline` → commit `97d858521fe37d42ebb61fc16c3e86c6bc50e95e`  

**Протестировано в среде агента:**

- тег создан локально;
- скрипты и docs добавлены;
- пробный dump: выполнить `.\scripts\backup_db_harvest_unify.ps1` (или `.sh` на VPS) перед следующим экспериментом — на агенте Docker мог отсутствовать; путь через `DATABASE_URL` + `pg_dump` описан в `.ps1`.

Полный цикл restore + e2e — **на staging/VPS** перед прод-экспериментом (см. чек-лист §6–7).

---

## Что этот документ не делает

- Не меняет бизнес-логику harvest/ТМЦ/заявок.  
- Не гарантирует сохранность данных **после** дампа без повторного бэкапа.  
- Не заменяет offsite-копии (`BACKUP_OFFSITE_TARGET` / `sync_backups_offsite.sh`).
