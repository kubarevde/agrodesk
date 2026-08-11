# Контроль и отчётность (ФОТ)

Вкладка `Сотрудники → Оплата труда → Контроль и отчётность` (`?payroll=reports`).

## API

| Метод | Путь | Назначение |
|-------|------|------------|
| GET | `/api/payroll-control/summary` | Read-only сводка за период |
| POST | `/api/payroll-control/export/accruals` | Excel реестр начислений |
| POST | `/api/payroll-control/export/payouts` | Excel ведомость выдачи |
| POST | `/api/payroll-control/export/advances` | Excel реестр авансов |

Права: manager + `payroll.view_all` (admin всегда). Org isolation через `org_id`.

## KPI

- **Начислено** — Σ `total_amount` строк confirmed/paid run, пересекающих период.
- **Проведено в расходы** — Σ Expenses `category=salary` с `payroll_run_line_id` на эти строки.
- **Выдано** — Σ связанных Payout по этим строкам (авансы + выплаты).
- **Остаток** — Σ `max(total − paid, 0)` по тем же строкам.

Draft, несвязанные авансы и ручные salary expenses **не** входят в основные KPI; они в «Требует внимания».

## Legacy

`/api/reports/salary-preview` и `/api/reports/salary` сохранены как «Предварительный расчёт по сменам» — не финансовый факт.
