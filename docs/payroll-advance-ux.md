# Payroll UX + авансы (2026-08-10)

## До доработки

- Аванс отличался только `payroll_run_line_id IS NULL`.
- Основной UX — «Выдача ЗП → Аванс до начисления» + ручная привязка.
- В селектах часто светился raw `cash`/`card`; даты — native `input type=date`.
- «Отчёты»: KPI за все периоды путали; Excel «Рассчитать» путали с «Выдано» / «Начислениями».
- Строки начислений открывались кнопкой «Открыть»; ставки на mobile — горизонтальный скролл.

## Что изменено

### UI
- `DatePicker` в создании run, выдаче, авансах, ставках.
- Select: `w-full`, перенос длинных названий, явные русские labels в `SelectValue`.
- Начисления: клик по строке/карточке, без «Открыть»; «Затраты» — текстовая ссылка.
- Ставки: mobile-карточки без горизонтального скролла.
- Отчёты: только preview по сменам (без KPI за все периоды); затраты ЗП датируются концом периода ведомости.
- Ведомость: колонка «Авансы», история с типом/способом на русском.

### Авансы
- Миграция `074_payroll_payout_kind`: `advance` | `salary_payment`.
- API `POST /api/payroll-runs/{id}/advances` (draft/confirmed, право `payroll.pay`).
- Кнопка «Выдать аванс» в карточке начисления.
- Исключение: «Зарегистрировать аванс вне начисления» в «Выдача ЗП».
- Пересчёт сохраняет авансы; при `paid > total` — предупреждение и блок confirm.

## Источник истины

| Показатель | Сущность |
|---|---|
| Начисление / премия | `PayrollRunLine` + `PayrollAdjustment` |
| Аванс / выплата | `PayrollPayout` (`payout_kind`) |
| Остаток | `total_amount − Σ payouts` |

## Формула

```
total = base + adjustments
paid  = Σ advances + Σ salary_payments
remainder = max(total − paid, 0)
```

## Сценарий 50k + 5k премия + 10k аванс + 45k выплата

Покрыт pytest (`test_bonus_plus_advance_remainder`, `test_advance_from_draft_run_*`).

## Тесты (API :8021)

- `test_payroll_advance_from_run` + finance + overpay unit + payouts API: **10 passed**
- Vitest payroll: **6 passed**
- `tsc --noEmit`: **ok**

## Ограничения

- Полный Playwright e2e chain на dirty demo ограничен лимитом сотрудников.
- Vite должен смотреть на API с миграцией `074` (сейчас proxy → `:8021`).
- Агрегация нескольких line одного сотрудника: аванс вешается на первую line, UI считает остаток по сотруднику.
