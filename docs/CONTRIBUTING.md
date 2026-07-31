# Contributing (фрагмент: миграции harvest / ТМЦ / заявки)

Полный чек-лист отката: [docs/rollback-harvest-unify.md](docs/rollback-harvest-unify.md).

## Миграции Alembic по доменам урожай / склад / заявки

1. Перед локальным `upgrade` на копии prod/staging:  
   `./scripts/backup_db_harvest_unify.sh` (или `.ps1` на Windows).
2. Только additive изменения в первой фазе (`ADD COLUMN` / таблицы / индексы / мягкий seed).  
   Не дропать колонки с данными в том же релизе.
3. `downgrade()` обязателен и не должен уничтожать данные прежней схемы.
4. Прогон: `./scripts/alembic_migration_smoke.sh` (upgrade → downgrade -1 → upgrade).
5. Prod-релиз: предпочтительно `./scripts/deploy_with_db_backup.sh`, не голый `deploy.sh`.

## Feature-flag

- `Organization.settings.shipment_requests_enabled` — выключить модуль заявок без отката БД.
