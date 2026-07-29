# Tech debt cleanup

## 2026-07-30 — рудименты после отказа от Yandex / MSW

Цель: убрать мёртвые флаги и middleware, синхронизировать документацию с
фактическим стеком **VPS + Postgres + локальные uploads**. Бизнес-логика модулей
не менялась.

### Решения

| Рудимент | Решение | Почему |
|----------|---------|--------|
| `VITE_USE_MOCKS` / MSW | **Удалён** | Папки `src/mocks/`, зависимости MSW и wiring в `main.tsx` никогда не было. Флаг создавал иллюзию mock-слоя. Локальная разработка идёт против реального API. |
| `exception_logging.py` | **Удалён** | Файл не импортировался ни в `main.py`, ни elsewhere. Рабочее логирование — `app.core.logging.setup_logging` (console + `logs/app.log`). |
| Yandex Object Storage / `YC_*` CI sync | **Зафиксирован отказ в доках** | Канал деплоя один: GitHub → зелёный CI → ручной `./deploy.sh` на VPS. Workflow `deploy.yml` на диске отсутствует. |
| Кадастр / Росреестр | **Зафиксирован отказ в `maps.md`** | Только ручной контур поля; автозагрузка по кадастровому номеру не реализована. |

### Что изменено в репозитории

- Удалены: `backend/app/middleware/exception_logging.py`, упоминания `VITE_USE_MOCKS` из `.env.example`, `.env.development`, `vite-env.d.ts`, Dockerfiles, Playwright / e2e workflow, README, `.cursor/rules/agrodesk-project.mdc`.
- Документы: `docs/offline.md`, `docs/maps.md`, `docs/DEPLOY.md`, `docs/PROD-UPDATE.md` — приведены к текущему поведению.
- Логирование API по-прежнему через `setup_logging()`; отдельный «middleware логирования исключений» не восстанавливался (нет потребителя).

### Проверка

```bash
npm run build
npm test
cd backend && python -m pytest tests/ -q
```

---

## 2026-07-29 — человекочитаемые подписи (поддержка + аудит)

Дата: 2026-07-29.

### Контекст

В UI на Base UI Select значение триггера берётся из **value**, если не передан
массив `items: { value, label }[]`. Из‑за этого в селектах поддержки в триггере
могли отображаться машинные коды (`new`, `bug`, `waiting_user`, `updated`),
хотя в выпадающем списке уже были русские `SelectItem`.

Модуль аудита уже имел словарь `AUDIT_ACTION_LABELS` / `AUDIT_SECTION_LABELS`,
но тесты не фиксировали, что фильтр «Все» отдаёт именно «Все действия», а не `all`.

### Что было сделано

1. **Поддержка** — `LabeledSelect` + хелперы в `features/support/labels.ts`.
2. **История изменений** — усилены тесты фильтров аудита (схема БД не менялась).
3. **E2E** — `e2e/support-audit-labels.spec.ts`.

Примечание: пункты Support 2.0 (вложения, org-wide inbox), упомянутые ранее как
«не в scope» этого UI-фикса, реализованы отдельной задачей после этой даты.
