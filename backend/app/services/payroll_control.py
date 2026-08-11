"""Read-only payroll control & reporting aggregates (no stored stats tables)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.expense import Expense
from app.models.payroll import PayrollPayout, PayrollRun, PayrollRunLine
from app.services.excel_styles import new_workbook, write_table
from app.services.payroll_payouts import (
    PAYOUT_KIND_ADVANCE,
    list_payouts_for_lines,
    _q,
)

ZERO = Decimal('0.00')

SCHEME_LABELS = {
    'hourly': 'Почасовая',
    'per_shift': 'Посменная',
    'monthly': 'Оклад',
    'piecework': 'Сдельная',
}
METHOD_LABELS = {
    'cash': 'Наличные',
    'bank_transfer': 'Банковский перевод',
    'card': 'На карту',
    'other': 'Другое',
}
STATUS_LABELS = {
    'draft': 'Черновик',
    'confirmed': 'Подтверждено',
    'paid': 'Выдано',
}


def _money(value: Decimal | float | int | str | None) -> float:
    return float(_q(value))


def _overlaps(run_start: date, run_end: date, period_start: date, period_end: date) -> bool:
    return run_start <= period_end and run_end >= period_start


def _month_key(d: date) -> str:
    return f'{d.year:04d}-{d.month:02d}'


def _month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def _months_in_range(period_start: date, period_end: date) -> list[str]:
    keys: list[str] = []
    y, m = period_start.year, period_start.month
    while date(y, m, 1) <= period_end:
        keys.append(f'{y:04d}-{m:02d}')
        if m == 12:
            y, m = y + 1, 1
        else:
            m += 1
    return keys


def _safe_expense_description(raw: str | None) -> str:
    text = (raw or '').strip()
    if not text:
        return 'Расход на зарплату без указания описания'
    lower = text.lower().replace(' ', '_')
    banned = (
        'payroll_run_line',
        'payroll_run',
        'run_line',
        'employee_id',
        'uuid',
        'null',
        'undefined',
    )
    if any(token in lower for token in banned) or 'payroll' in lower:
        return 'Расход на зарплату без связи с начислением'
    return text


ATTENTION_TITLES = {
    'unpaid_confirmed': 'Есть невыплаченная зарплата',
    'draft_runs': 'Черновик начисления ожидает подтверждения',
    'unlinked_advances': 'Аванс ожидает привязки',
    'missing_expense': 'Начисление не проведено в расходы',
    'orphan_salary_expense': 'Расход на зарплату без связи с начислением',
    'overpaid': 'Выдано больше, чем начислено',
    'inconsistent': 'Запись требует проверки данных',
}

ATTENTION_EXPLANATIONS = {
    'unpaid_confirmed': (
        'По подтверждённым начислениям остаётся сумма, которую ещё не выдали сотрудникам.'
    ),
    'draft_runs': (
        'Есть черновик начисления за период — его нужно проверить и подтвердить.'
    ),
    'unlinked_advances': (
        'Суммы уже выданы, но ещё не привязаны к конкретному начислению сотрудника.'
    ),
    'missing_expense': (
        'Есть подтверждённые начисления без расхода в категории «Зарплата».'
    ),
    'orphan_salary_expense': (
        'В расходах есть запись по категории «Зарплата», добавленная вручную '
        'и не связанная с конкретным начислением сотрудника.'
    ),
    'overpaid': (
        'По некоторым сотрудникам сумма авансов и выплат превышает подтверждённую '
        'сумму начисления.'
    ),
    'inconsistent': (
        'Найдены записи с неполными данными. Они не скрыты, чтобы их можно было проверить.'
    ),
}

# Priority for month short status (lower index = higher priority).
STATUS_ISSUE_PRIORITY = (
    'overpaid',
    'missing_expense',
    'unpaid_confirmed',
    'unlinked_advances',
    'orphan_salary_expense',
    'inconsistent',
)

MONTH_STATUS_LABELS = {
    'overpaid': 'Выдано больше начисленного',
    'missing_expense': 'Есть начисления без расходов',
    'unpaid_confirmed': 'Есть невыплаченная зарплата',
    'unlinked_advances': 'Есть несвязанные авансы',
    'orphan_salary_expense': 'Есть несвязанные расходы на зарплату',
    'inconsistent': 'Есть данные, требующие проверки',
}


def _issue_bucket() -> dict[str, dict[str, Any]]:
    return {
        key: {'kind': key, 'count': 0, 'amount': ZERO}
        for key in (
            'overpaid',
            'missing_expense',
            'unpaid_confirmed',
            'unlinked_advances',
            'orphan_salary_expense',
            'inconsistent',
            'draft_runs',
        )
    }


def _add_issue(
    issues: dict[str, dict[str, Any]],
    kind: str,
    *,
    amount: Decimal = ZERO,
    count: int = 1,
) -> None:
    row = issues.get(kind)
    if row is None:
        return
    row['count'] += count
    row['amount'] += _q(amount)


def _month_status_from_issues(
    *,
    issues: dict[str, dict[str, Any]],
    has_draft: bool,
    has_confirmed: bool,
    fully_paid: bool,
) -> tuple[str, str, int]:
    """Return (status_code, status_label, issues_count)."""
    active = [k for k in STATUS_ISSUE_PRIORITY if issues[k]['count'] > 0]
    issues_count = len(active)

    if issues_count >= 2:
        return 'multiple_issues', f'Несколько проблем · {issues_count}', issues_count
    if issues_count == 1:
        kind = active[0]
        return kind, MONTH_STATUS_LABELS[kind], 1
    if has_draft:
        return 'has_draft', 'Черновик есть', 0
    if has_confirmed and fully_paid:
        return 'paid', 'Выдано', 0
    if not has_confirmed and not has_draft:
        return 'empty', 'Нет данных', 0
    return 'needs_payout', 'Требует выдачи', 0


def _employee_label(emp: Employee | None) -> tuple[str, str]:
    if emp is None:
        return 'Сотрудник недоступен', '—'
    name = (emp.full_name or 'Сотрудник').strip() or 'Сотрудник'
    code = getattr(emp, 'employee_code', None) or getattr(emp, 'code', None) or '—'
    return name, str(code)


def _adj_signed(adj: Any) -> Decimal:
    amount = _q(getattr(adj, 'amount', 0))
    sign = int(getattr(adj, 'sign', 1) or 1)
    return amount * Decimal(sign)


async def build_payroll_control_summary(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
) -> dict[str, Any]:
    if period_end < period_start:
        raise ValueError('Дата начала не может быть позже даты окончания')

    runs_result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.adjustments),
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.employee),
        )
        .where(
            PayrollRun.org_id == org_id,
            PayrollRun.period_start <= period_end,
            PayrollRun.period_end >= period_start,
        )
        .order_by(PayrollRun.period_start.asc())
    )
    runs = list(runs_result.scalars().unique().all())

    all_lines: list[PayrollRunLine] = []
    run_by_id: dict[UUID, PayrollRun] = {}
    for run in runs:
        run_by_id[run.id] = run
        all_lines.extend(list(run.lines or []))

    line_ids = [line.id for line in all_lines]
    payouts_by_line = await list_payouts_for_lines(db, line_ids)

    # Linked salary expenses for lines in overlapping runs
    expenses_by_line: dict[UUID, Expense] = {}
    if line_ids:
        exp_rows = await db.execute(
            select(Expense).where(
                Expense.org_id == org_id,
                Expense.category == 'salary',
                Expense.payroll_run_line_id.in_(line_ids),
            )
        )
        for exp in exp_rows.scalars().all():
            if exp.payroll_run_line_id is not None:
                expenses_by_line[exp.payroll_run_line_id] = exp

    # Unlinked salary expenses in date range
    unlinked_exp_rows = await db.execute(
        select(Expense)
        .options(selectinload(Expense.created_by_user))
        .where(
            Expense.org_id == org_id,
            Expense.category == 'salary',
            Expense.payroll_run_line_id.is_(None),
            Expense.date >= period_start,
            Expense.date <= period_end,
        )
        .order_by(Expense.date.desc())
    )
    unlinked_expenses = list(unlinked_exp_rows.scalars().all())

    # Unlinked advances (by payout_date in period)
    unlinked_adv_rows = await db.execute(
        select(PayrollPayout)
        .options(selectinload(PayrollPayout.employee))
        .where(
            PayrollPayout.org_id == org_id,
            PayrollPayout.payout_kind == PAYOUT_KIND_ADVANCE,
            PayrollPayout.payroll_run_line_id.is_(None),
            PayrollPayout.payout_date >= period_start,
            PayrollPayout.payout_date <= period_end,
        )
        .order_by(PayrollPayout.payout_date.desc())
    )
    unlinked_advances = list(unlinked_adv_rows.scalars().all())

    confirmed_lines: list[tuple[PayrollRun, PayrollRunLine, Decimal, Decimal]] = []
    # (run, line, paid, advance_paid)

    accrued = ZERO
    expenses_posted = ZERO
    paid_total = ZERO
    remainder_total = ZERO

    for run in runs:
        for line in run.lines or []:
            payouts = payouts_by_line.get(line.id, [])
            paid = _q(sum((_q(p.amount_paid) for p in payouts), ZERO))
            advance_paid = _q(
                sum(
                    (
                        _q(p.amount_paid)
                        for p in payouts
                        if str(getattr(p, 'payout_kind', '')) == PAYOUT_KIND_ADVANCE
                    ),
                    ZERO,
                )
            )
            if run.status in ('confirmed', 'paid'):
                total = _q(line.total_amount)
                accrued += total
                paid_total += paid
                rem = total - paid
                if rem > ZERO:
                    remainder_total += rem
                confirmed_lines.append((run, line, paid, advance_paid))
                if line.id in expenses_by_line:
                    expenses_posted += _q(expenses_by_line[line.id].amount)

    # --- Attention items ---
    attention: dict[str, list[dict[str, Any]]] = {
        'unpaid_confirmed': [],
        'draft_runs': [],
        'unlinked_advances': [],
        'missing_expense': [],
        'orphan_salary_expense': [],
        'overpaid': [],
        'inconsistent': [],
    }

    for run, line, paid, _adv in confirmed_lines:
        total = _q(line.total_amount)
        rem = total - paid
        name, code = _employee_label(line.employee)
        period_label = f'{run.period_start.isoformat()} — {run.period_end.isoformat()}'
        if line.employee is None:
            attention['inconsistent'].append(
                {
                    'kind': 'inconsistent',
                    'title': 'Обнаружена запись, требующая проверки данных',
                    'detail': 'Строка начисления без сотрудника',
                    'run_id': str(run.id),
                    'line_id': str(line.id),
                    'amount': _money(total),
                }
            )
        if rem > ZERO and line.remainder_closed_at is None:
            attention['unpaid_confirmed'].append(
                {
                    'kind': 'unpaid_confirmed',
                    'employee_id': str(line.employee_id) if line.employee_id else None,
                    'employee_name': name,
                    'employee_code': code,
                    'run_id': str(run.id),
                    'line_id': str(line.id),
                    'period_start': run.period_start.isoformat(),
                    'period_end': run.period_end.isoformat(),
                    'period_label': period_label,
                    'accrued': _money(total),
                    'paid': _money(paid),
                    'remainder': _money(rem),
                }
            )
        if paid > total:
            attention['overpaid'].append(
                {
                    'kind': 'overpaid',
                    'critical': True,
                    'employee_id': str(line.employee_id) if line.employee_id else None,
                    'employee_name': name,
                    'employee_code': code,
                    'run_id': str(run.id),
                    'line_id': str(line.id),
                    'period_start': run.period_start.isoformat(),
                    'period_end': run.period_end.isoformat(),
                    'period_label': period_label,
                    'accrued': _money(total),
                    'paid': _money(paid),
                    'overpay': _money(paid - total),
                }
            )
        if line.id not in expenses_by_line:
            attention['missing_expense'].append(
                {
                    'kind': 'missing_expense',
                    'employee_id': str(line.employee_id) if line.employee_id else None,
                    'employee_name': name,
                    'employee_code': code,
                    'run_id': str(run.id),
                    'line_id': str(line.id),
                    'period_start': run.period_start.isoformat(),
                    'period_end': run.period_end.isoformat(),
                    'period_label': period_label,
                    'amount': _money(total),
                }
            )

    for run in runs:
        if run.status != 'draft':
            continue
        lines = list(run.lines or [])
        total = _q(sum((_q(l.total_amount) for l in lines), ZERO))
        attention['draft_runs'].append(
            {
                'kind': 'draft_runs',
                'run_id': str(run.id),
                'period_start': run.period_start.isoformat(),
                'period_end': run.period_end.isoformat(),
                'period_label': f'{run.period_start.isoformat()} — {run.period_end.isoformat()}',
                'created_at': run.created_at.isoformat() if run.created_at else None,
                'employees_count': len({l.employee_id for l in lines}),
                'total_amount': _money(total),
            }
        )

    for payout in unlinked_advances:
        name, code = _employee_label(payout.employee)
        attention['unlinked_advances'].append(
            {
                'kind': 'unlinked_advances',
                'payout_id': str(payout.id),
                'employee_id': str(payout.employee_id) if payout.employee_id else None,
                'employee_name': name,
                'employee_code': code,
                'payout_date': payout.payout_date.isoformat(),
                'amount': _money(payout.amount_paid),
                'payout_method': METHOD_LABELS.get(
                    str(payout.payout_method), '—'
                ),
                'comment': (payout.comment or '').strip() or None,
            }
        )

    for exp in unlinked_expenses:
        author = None
        if exp.created_by_user is not None:
            author = (exp.created_by_user.full_name or '').strip() or None
        attention['orphan_salary_expense'].append(
            {
                'kind': 'orphan_salary_expense',
                'expense_id': str(exp.id),
                'date': exp.date.isoformat(),
                'amount': _money(exp.amount),
                'description': _safe_expense_description(exp.description),
                'author_name': author or '—',
            }
        )

    attention_groups = []
    for key, title in ATTENTION_TITLES.items():
        items = attention[key]
        if not items:
            continue
        amount_sum = ZERO
        for item in items:
            for field in ('remainder', 'overpay', 'amount', 'total_amount', 'accrued'):
                if item.get(field) is not None:
                    amount_sum += _q(item[field])
                    break
        attention_groups.append(
            {
                'kind': key,
                'title': title,
                'explanation': ATTENTION_EXPLANATIONS.get(key, ''),
                'count': len(items),
                'amount': _money(amount_sum),
                'critical': key in ('overpaid', 'inconsistent'),
                'items': items,
            }
        )

    # --- Monthly dynamics ---
    month_keys = _months_in_range(period_start, period_end)
    month_buckets: dict[str, dict[str, Any]] = {}
    for mk in month_keys:
        y, m = map(int, mk.split('-'))
        ms, me = _month_bounds(y, m)
        month_buckets[mk] = {
            'month': mk,
            'month_start': ms.isoformat(),
            'month_end': me.isoformat(),
            'accrued': ZERO,
            'expenses_posted': ZERO,
            'paid': ZERO,
            'remainder': ZERO,
            'employee_ids': set(),
            'has_draft': False,
            'has_remainder': False,
            'fully_paid': True,
            'has_confirmed': False,
            'issues': _issue_bucket(),
        }

    for run in runs:
        mk = _month_key(run.period_end)
        if mk not in month_buckets:
            continue
        bucket = month_buckets[mk]
        if run.status == 'draft':
            bucket['has_draft'] = True
            _add_issue(bucket['issues'], 'draft_runs')
        for line in run.lines or []:
            payouts = payouts_by_line.get(line.id, [])
            paid = _q(sum((_q(p.amount_paid) for p in payouts), ZERO))
            if run.status in ('confirmed', 'paid'):
                total = _q(line.total_amount)
                bucket['has_confirmed'] = True
                bucket['accrued'] += total
                bucket['paid'] += paid
                rem = total - paid
                if rem > ZERO and line.remainder_closed_at is None:
                    bucket['remainder'] += rem
                    bucket['has_remainder'] = True
                    bucket['fully_paid'] = False
                    _add_issue(bucket['issues'], 'unpaid_confirmed', amount=rem)
                if paid > total:
                    bucket['fully_paid'] = False
                    _add_issue(bucket['issues'], 'overpaid', amount=paid - total)
                if line.employee is None:
                    _add_issue(bucket['issues'], 'inconsistent', amount=total)
                if line.employee_id:
                    bucket['employee_ids'].add(line.employee_id)
                if line.id in expenses_by_line:
                    bucket['expenses_posted'] += _q(expenses_by_line[line.id].amount)
                else:
                    _add_issue(bucket['issues'], 'missing_expense', amount=total)
            else:
                bucket['fully_paid'] = False

    for payout in unlinked_advances:
        mk = _month_key(payout.payout_date)
        if mk in month_buckets:
            _add_issue(
                month_buckets[mk]['issues'],
                'unlinked_advances',
                amount=_q(payout.amount_paid),
            )
    for exp in unlinked_expenses:
        mk = _month_key(exp.date)
        if mk in month_buckets:
            _add_issue(
                month_buckets[mk]['issues'],
                'orphan_salary_expense',
                amount=_q(exp.amount),
            )

    dynamics = []
    for mk in month_keys:
        b = month_buckets[mk]
        status, status_label, issues_count = _month_status_from_issues(
            issues=b['issues'],
            has_draft=b['has_draft'],
            has_confirmed=b['has_confirmed'],
            fully_paid=b['fully_paid'],
        )
        issue_list = []
        for kind in STATUS_ISSUE_PRIORITY:
            row = b['issues'][kind]
            if row['count'] <= 0:
                continue
            issue_list.append(
                {
                    'kind': kind,
                    'title': ATTENTION_TITLES[kind],
                    'explanation': ATTENTION_EXPLANATIONS[kind],
                    'count': row['count'],
                    'amount': _money(row['amount']),
                    'status_label': MONTH_STATUS_LABELS[kind],
                }
            )
        dynamics.append(
            {
                'month': mk,
                'month_start': b['month_start'],
                'month_end': b['month_end'],
                'accrued': _money(b['accrued']),
                'expenses_posted': _money(b['expenses_posted']),
                'paid': _money(b['paid']),
                'remainder': _money(b['remainder']),
                'employees_count': len(b['employee_ids']),
                'status': status,
                'status_label': status_label,
                'issues_count': issues_count,
                'issues': issue_list,
            }
        )

    # --- Employee totals ---
    by_emp: dict[UUID, dict[str, Any]] = {}
    for run, line, paid, advance_paid in confirmed_lines:
        emp_id = line.employee_id
        if emp_id is None:
            continue
        row = by_emp.get(emp_id)
        if row is None:
            name, code = _employee_label(line.employee)
            row = {
                'employee_id': str(emp_id),
                'employee_name': name,
                'employee_code': code,
                'accrued': ZERO,
                'bonuses': ZERO,
                'penalties_deductions': ZERO,
                'advances': ZERO,
                'paid': ZERO,
                'remainder_raw': ZERO,
                'schemes': set(),
                'has_draft': False,
                'has_overpay': False,
                'run_ids': set(),
            }
            by_emp[emp_id] = row
        total = _q(line.total_amount)
        row['accrued'] += total
        row['paid'] += paid
        row['advances'] += advance_paid
        row['remainder_raw'] += total - paid
        row['schemes'].add(str(line.payment_scheme))
        row['run_ids'].add(str(run.id))
        for adj in line.adjustments or []:
            signed = _adj_signed(adj)
            t = str(adj.type)
            if t == 'bonus':
                row['bonuses'] += signed
            elif t in ('penalty', 'deduction'):
                row['penalties_deductions'] += signed

    draft_emp_ids: set[UUID] = set()
    for run in runs:
        if run.status != 'draft':
            continue
        for line in run.lines or []:
            if line.employee_id:
                draft_emp_ids.add(line.employee_id)
                if line.employee_id not in by_emp:
                    name, code = _employee_label(line.employee)
                    by_emp[line.employee_id] = {
                        'employee_id': str(line.employee_id),
                        'employee_name': name,
                        'employee_code': code,
                        'accrued': ZERO,
                        'bonuses': ZERO,
                        'penalties_deductions': ZERO,
                        'advances': ZERO,
                        'paid': ZERO,
                        'remainder_raw': ZERO,
                        'schemes': {str(line.payment_scheme)},
                        'has_draft': True,
                        'has_overpay': False,
                        'run_ids': {str(run.id)},
                    }
                else:
                    by_emp[line.employee_id]['has_draft'] = True
                    by_emp[line.employee_id]['schemes'].add(str(line.payment_scheme))

    employees = []
    for emp_id, row in by_emp.items():
        rem = row['remainder_raw']
        has_overpay = rem < ZERO
        if row['has_draft'] and row['accrued'] == ZERO:
            status = 'draft'
            status_label = 'Черновик'
        elif has_overpay:
            status = 'needs_check'
            status_label = 'Требует проверки'
        elif rem <= ZERO and row['accrued'] > ZERO:
            status = 'paid'
            status_label = 'Выдано'
        elif row['paid'] > ZERO:
            status = 'partial'
            status_label = 'Выдано частично'
        elif row['accrued'] > ZERO:
            status = 'unpaid'
            status_label = 'Не выдано'
        else:
            status = 'draft'
            status_label = 'Черновик'
        schemes = [s for s in ('hourly', 'per_shift', 'monthly', 'piecework') if s in row['schemes']]
        scheme_labels = [SCHEME_LABELS.get(s, s) for s in schemes]
        employees.append(
            {
                'employee_id': row['employee_id'],
                'employee_name': row['employee_name'],
                'employee_code': row['employee_code'],
                'accrued': _money(row['accrued']),
                'bonuses': _money(row['bonuses']),
                'penalties_deductions': _money(row['penalties_deductions']),
                'advances': _money(row['advances']),
                'paid': _money(row['paid']),
                'remainder': _money(rem),
                'schemes': schemes,
                'schemes_label': ' + '.join(scheme_labels) if scheme_labels else '—',
                'status': status,
                'status_label': status_label,
                'has_draft': row['has_draft'] or emp_id in draft_emp_ids,
                'has_overpay': has_overpay,
                'run_id': next(iter(row['run_ids']), None),
            }
        )
    employees.sort(key=lambda r: r['employee_name'].lower())

    # --- Schemes structure ---
    scheme_stats: dict[str, dict[str, Any]] = {
        key: {'scheme': key, 'label': label, 'employees': set(), 'accrued': ZERO}
        for key, label in SCHEME_LABELS.items()
    }
    for run, line, _paid, _adv in confirmed_lines:
        scheme = str(line.payment_scheme)
        if scheme not in scheme_stats:
            scheme_stats[scheme] = {
                'scheme': scheme,
                'label': SCHEME_LABELS.get(scheme, '—'),
                'employees': set(),
                'accrued': ZERO,
            }
        scheme_stats[scheme]['accrued'] += _q(line.total_amount)
        if line.employee_id:
            scheme_stats[scheme]['employees'].add(line.employee_id)

    schemes = [
        {
            'scheme': key,
            'label': scheme_stats[key]['label'],
            'employees_count': len(scheme_stats[key]['employees']),
            'accrued': _money(scheme_stats[key]['accrued']),
        }
        for key in ('hourly', 'per_shift', 'monthly', 'piecework')
    ]

    return {
        'period_start': period_start.isoformat(),
        'period_end': period_end.isoformat(),
        'kpi': {
            'accrued': _money(accrued),
            'expenses_posted': _money(expenses_posted),
            'paid': _money(paid_total),
            'remainder': _money(remainder_total),
        },
        'dynamics': dynamics,
        'attention': attention_groups,
        'employees': employees,
        'schemes': schemes,
        'meta': {
            'runs_count': len(runs),
            'confirmed_lines_count': len(confirmed_lines),
            'draft_runs_count': sum(1 for r in runs if r.status == 'draft'),
            'attention_total': sum(g['count'] for g in attention_groups),
        },
    }


async def build_accruals_export_workbook(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
):
    summary = await build_payroll_control_summary(
        db, org_id=org_id, period_start=period_start, period_end=period_end
    )
    wb = new_workbook()
    ws = wb.active
    ws.title = 'Начисления'
    headers = [
        'Период с',
        'Период по',
        'Сотрудник',
        'Логин',
        'Схема',
        'База',
        'Корректировки',
        'Начислено',
        'Выдано',
        'Остаток',
        'Статус начисления',
        'Статус выдачи',
    ]
    rows: list[list[object]] = []

    runs_result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.adjustments),
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.employee),
        )
        .where(
            PayrollRun.org_id == org_id,
            PayrollRun.status.in_(('confirmed', 'paid')),
            PayrollRun.period_start <= period_end,
            PayrollRun.period_end >= period_start,
        )
        .order_by(PayrollRun.period_start.asc())
    )
    runs = list(runs_result.scalars().unique().all())
    line_ids = [line.id for run in runs for line in (run.lines or [])]
    payouts_by_line = await list_payouts_for_lines(db, line_ids)

    for run in runs:
        for line in run.lines or []:
            payouts = payouts_by_line.get(line.id, [])
            paid = _q(sum((_q(p.amount_paid) for p in payouts), ZERO))
            total = _q(line.total_amount)
            rem = total - paid
            name, code = _employee_label(line.employee)
            rows.append(
                [
                    run.period_start.isoformat(),
                    run.period_end.isoformat(),
                    name,
                    code,
                    SCHEME_LABELS.get(str(line.payment_scheme), '—'),
                    _money(line.base_calculated_amount),
                    _money(line.adjustments_total),
                    _money(total),
                    _money(paid),
                    _money(rem),
                    STATUS_LABELS.get(str(run.status), '—'),
                    {
                        'unpaid': 'Не выдано',
                        'partially_paid': 'Выдано частично',
                        'paid': 'Выдано',
                    }.get(str(line.payout_status), '—'),
                ]
            )

    if not rows:
        rows = [['Нет данных за выбранный период', '', '', '', '', '', '', '', '', '', '', '']]
    write_table(ws, headers, rows)
    # silence unused summary warning for future sheets
    _ = summary
    return wb


async def build_payouts_export_workbook(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
):
    wb = new_workbook()
    ws = wb.active
    ws.title = 'Выдачи'
    headers = [
        'Период с',
        'Период по',
        'Сотрудник',
        'Логин',
        'Начислено',
        'Авансы',
        'Выплаты ЗП',
        'Выдано всего',
        'Остаток',
        'Дата выдачи',
        'Способ',
        'Вид',
        'Сумма операции',
        'Комментарий',
    ]
    rows: list[list[object]] = []

    runs_result = await db.execute(
        select(PayrollRun)
        .options(
            selectinload(PayrollRun.lines).selectinload(PayrollRunLine.employee),
        )
        .where(
            PayrollRun.org_id == org_id,
            PayrollRun.status.in_(('confirmed', 'paid')),
            PayrollRun.period_start <= period_end,
            PayrollRun.period_end >= period_start,
        )
        .order_by(PayrollRun.period_start.asc())
    )
    runs = list(runs_result.scalars().unique().all())
    line_ids = [line.id for run in runs for line in (run.lines or [])]
    payouts_by_line = await list_payouts_for_lines(db, line_ids)

    for run in runs:
        for line in run.lines or []:
            payouts = payouts_by_line.get(line.id, [])
            paid = _q(sum((_q(p.amount_paid) for p in payouts), ZERO))
            advance = _q(
                sum(
                    (
                        _q(p.amount_paid)
                        for p in payouts
                        if str(getattr(p, 'payout_kind', '')) == PAYOUT_KIND_ADVANCE
                    ),
                    ZERO,
                )
            )
            salary_paid = paid - advance
            total = _q(line.total_amount)
            rem = total - paid
            name, code = _employee_label(line.employee)
            if not payouts:
                rows.append(
                    [
                        run.period_start.isoformat(),
                        run.period_end.isoformat(),
                        name,
                        code,
                        _money(total),
                        _money(advance),
                        _money(salary_paid),
                        _money(paid),
                        _money(rem),
                        '—',
                        '—',
                        '—',
                        '—',
                        'Нет выплат',
                    ]
                )
                continue
            for p in payouts:
                kind = (
                    'Аванс'
                    if str(getattr(p, 'payout_kind', '')) == PAYOUT_KIND_ADVANCE
                    else 'Выплата ЗП'
                )
                rows.append(
                    [
                        run.period_start.isoformat(),
                        run.period_end.isoformat(),
                        name,
                        code,
                        _money(total),
                        _money(advance),
                        _money(salary_paid),
                        _money(paid),
                        _money(rem),
                        p.payout_date.isoformat(),
                        METHOD_LABELS.get(str(p.payout_method), '—'),
                        kind,
                        _money(p.amount_paid),
                        (p.comment or '').strip() or '—',
                    ]
                )

    if not rows:
        rows = [['Нет данных за выбранный период'] + [''] * (len(headers) - 1)]
    write_table(ws, headers, rows)
    return wb


async def build_advances_export_workbook(
    db: AsyncSession,
    *,
    org_id: UUID,
    period_start: date,
    period_end: date,
):
    wb = new_workbook()
    ws = wb.active
    ws.title = 'Авансы'
    headers = [
        'Сотрудник',
        'Логин',
        'Дата',
        'Сумма',
        'Способ',
        'Комментарий',
        'Привязан',
        'Период начисления с',
        'Период начисления по',
    ]
    rows: list[list[object]] = []

    # Linked advances via overlapping runs
    runs_result = await db.execute(
        select(PayrollRun)
        .options(selectinload(PayrollRun.lines))
        .where(
            PayrollRun.org_id == org_id,
            PayrollRun.period_start <= period_end,
            PayrollRun.period_end >= period_start,
        )
    )
    runs = list(runs_result.scalars().unique().all())
    line_to_run = {
        line.id: run for run in runs for line in (run.lines or [])
    }
    line_ids = list(line_to_run.keys())
    payouts_by_line = await list_payouts_for_lines(db, line_ids)

    for line_id, payouts in payouts_by_line.items():
        run = line_to_run.get(line_id)
        for p in payouts:
            if str(getattr(p, 'payout_kind', '')) != PAYOUT_KIND_ADVANCE:
                continue
            name, code = _employee_label(p.employee)
            rows.append(
                [
                    name,
                    code,
                    p.payout_date.isoformat(),
                    _money(p.amount_paid),
                    METHOD_LABELS.get(str(p.payout_method), '—'),
                    (p.comment or '').strip() or '—',
                    'Да',
                    run.period_start.isoformat() if run else '—',
                    run.period_end.isoformat() if run else '—',
                ]
            )

    unlinked = await db.execute(
        select(PayrollPayout)
        .options(selectinload(PayrollPayout.employee))
        .where(
            PayrollPayout.org_id == org_id,
            PayrollPayout.payout_kind == PAYOUT_KIND_ADVANCE,
            PayrollPayout.payroll_run_line_id.is_(None),
            PayrollPayout.payout_date >= period_start,
            PayrollPayout.payout_date <= period_end,
        )
        .order_by(PayrollPayout.payout_date.asc())
    )
    for p in unlinked.scalars().all():
        name, code = _employee_label(p.employee)
        rows.append(
            [
                name,
                code,
                p.payout_date.isoformat(),
                _money(p.amount_paid),
                METHOD_LABELS.get(str(p.payout_method), '—'),
                (p.comment or '').strip() or '—',
                'Нет',
                '—',
                '—',
            ]
        )

    if not rows:
        rows = [['Нет данных за выбранный период'] + [''] * (len(headers) - 1)]
    write_table(ws, headers, rows)
    return wb
