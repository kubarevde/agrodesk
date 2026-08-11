# Payroll finance audit — AS-IS → TO-BE (2026-08-10)

## 1. AS-IS (до исправлений)

| Сущность / действие | Как работало в коде | Целевая модель | Что исправить |
|---|---|---|---|
| Создание payroll run | `populate_run_lines` строит base из смен/ставок/сделки/оклада | OK | — |
| Пересчёт payroll run | Удалял lines → CASCADE сносил корректировки; блокировался при payout | Пересчитать base, сохранить adjustments/payouts | `preserve_adjustments=True` |
| Корректировка «Премия» | `bonus`, sign+, входит в `total_amount` | OK | UI: блок корректировок |
| Корректировка «Штраф» | `penalty`, sign− | OK | — |
| Корректировка «Удержание» | `deduction`, sign− | OK | — |
| Корректировка «Другое» | `other`, знак явный | OK | — |
| Регистрация аванса | `PayrollPayout` без line | Аванс ≠ корректировка | OK по модели; UI разделять |
| Привязка аванса | link → `amount_paid` | Не меняет total | + guard переплаты |
| Частичная выдача | linked payout | paid ≤ total | overpay guard |
| Подтверждение | draft→confirmed + Expense/line | OK | — |
| Создание Expense | category=salary, 1 на line | OK | — |
| Отмена подтверждения | только без payout | OK | — |
| Список начислений | общий RQ key с выдачей → cache poison | все статусы | key `for-payout` |
| Ведомость выдачи | часть labels/сырых enum | русские деньги | labels + formatMoney |

## 2. Найденные ошибки и причины

1. **Сырые значения в «Выдача ЗП»** — в основном статусы/схемы без labels и отравленный cache списка начислений; колонка «Начислено» должна быть `formatMoney(totalAmount)`.
2. **Неполная загрузка начислений** — React Query key `['payroll-runs']` общий: фильтр confirmed/paid в выдаче затирал draft в «Начисления».
3. **«Пересчитать»** — пересоздавал lines и терял премии; UI без confirm.
4. **Премия vs аванс** — backend уже разделял сущности; UI/справка смешивали восприятие; не было жёсткого overpay guard.
5. **Живой API на :8020** — зомби-процесс без новых правок; тесты overpay проходили только на свежем :8021.

## 3. Исправления (безопасно)

| Файл | Изменение |
|---|---|
| `backend/app/services/payroll.py` | `populate_run_lines(..., preserve_adjustments=True)` — snapshot adjustments/payouts → rebuild base → restore |
| `backend/app/routers/payroll_runs.py` | recalculate с preserve; employee fallback «Сотрудник недоступен» |
| `backend/app/services/payroll_payouts.py` | запрет выплаты/привязки аванса выше остатка |
| `src/features/payroll-payouts/hooks.ts` | queryKey `['payroll-runs','for-payout']` |
| `src/features/payroll/components/PayrollRunActions.tsx` | confirm-dialog + toast про сохранение корректировок |
| `src/features/payroll/components/PayrollRunDetail.tsx` | KPI: база / корректировки / начислено / выдано / остаток |
| `src/features/help/content.ts` | справка «Пересчитать», премия vs аванс |
| `backend/tests/test_payroll_finance_model.py` | изоляция периодов/ставок + сценарий 50k+5k+10k |
| `backend/tests/test_payroll_overpay_unit.py` | unit overpay без живого uvicorn |
| `e2e/payroll-labor.spec.ts` | нет raw enum; dialog «Пересчитать» |

## 4. Итоговая формула

```
base_calculated_amount  = Σ источников (смены × ставки / оклад / сделка)
adjustments_net         = Σ bonus/other(+) − Σ penalty/deduction/other(−)
total_amount            = base_calculated_amount + adjustments_net
paid_amount             = Σ linked PayrollPayout (включая привязанные авансы)
remaining_amount        = max(total_amount − paid_amount, 0)
```

Аванс **не** входит в adjustments и **не** меняет `total_amount`.

## 5. «Пересчитать»

- Только `draft`.
- Пересчитывает base + source_breakdown; сохраняет ручные корректировки; re-link payouts.
- Не создаёт Expense, не меняет status.
- Confirm: «Пересчитать начисление?» + текст про сохранение корректировок.
- Toast: «Начисление пересчитано. Ручные корректировки сохранены».
- confirmed/paid: кнопка disabled + tooltip про отмену подтверждения.

## 6. Сценарий 50 000 + премия 5 000 + аванс 10 000

На изолированном окне ставок (monthly base + bonus + advance link):  
начислено = base+5000; выдано = 10000; остаток = начислено−10000.  
Pytest: `test_bonus_plus_advance_remainder` — **passed** (API :8021).

## 7. Результаты прогонов

| Проверка | Результат |
|---|---|
| pytest finance + base rates + overpay unit (`API_BASE_URL=http://127.0.0.1:8021`) | **8 passed** |
| vitest `src/features/payroll*` | **6 passed** |
| Playwright full chain | smoke обновлён; полный UI-chain зависит от демо-ставок/смен |
| typecheck / lint / полный Playwright | не блокировали фикс; рекомендуется после рестарта API :8020 |

## 8. Загрузка начислений

После раздельного query key drafts снова видны после визита «Выдача ЗП».  
Строки с недоступным сотрудником не пропадают молча (fallback-имя).  
Если UI всё ещё «пустой» — убедиться, что Vite проксирует на API **с актуальным кодом** (не зомби :8020).

## 9. Ограничения

- Demo-орг на лимите сотрудников (50/10) — тесты reuse сотрудников + far-future периоды.
- Порт **8020** может держать старый процесс без overpay guard — для проверки использовать свежий uvicorn или убить listener вручную.
- Полный Playwright «создать сотрудника → ставка → смена → run → …» на dirty demo ограничен лимитом сотрудников; критичная математика закрыта backend pytest.
- Отдельная `DATABASE_URL` только для pytest в этом окружении не поднималась; изоляция достигнута периодами/ставками на demo DB + unit-тесты сервиса.
