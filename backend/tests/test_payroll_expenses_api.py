"""API: confirm posts salary expenses; unconfirm deletes / blocks on payouts."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    rows = client.get('/api/employees', headers=headers)
    assert rows.status_code == 200, rows.text
    return rows.json()[0]['id']


def _next_free_base_from(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
) -> date:
    listed = client.get(
        '/api/employee-rates',
        headers=headers,
        params={'employee_id': employee_id},
    )
    assert listed.status_code == 200, listed.text
    bounds: list[date] = []
    for row in listed.json():
        if row.get('work_type_id') is not None:
            continue
        bounds.append(date.fromisoformat(str(row['valid_from'])))
        if row.get('valid_to'):
            bounds.append(date.fromisoformat(str(row['valid_to'])))
    offset = 50 + (uuid4().int % 60)
    if not bounds:
        return date.today() + timedelta(days=offset)
    return max(bounds) + timedelta(days=offset)


def _unique_month() -> tuple[date, date]:
    month = 1 + (uuid4().int % 12)
    year = 2035 + (uuid4().int % 4)
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return start, end


def _next_free_run_period(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    prefer_start: date,
) -> tuple[date, date]:
    """Pick a period starting at/after prefer_start that does not overlap existing runs."""
    listed = client.get('/api/payroll-runs', headers=headers)
    assert listed.status_code == 200, listed.text
    occupied = [
        (
            date.fromisoformat(str(row['period_start'])),
            date.fromisoformat(str(row['period_end'])),
        )
        for row in listed.json()
    ]

    def overlaps(a: date, b: date) -> bool:
        return any(s <= b and e >= a for s, e in occupied)

    start = prefer_start
    for _ in range(36):
        end = date(start.year, start.month, monthrange(start.year, start.month)[1])
        if end < start:
            end = start
        if not overlaps(start, end):
            return start, end
        # Jump to first day of next month
        if start.month == 12:
            start = date(start.year + 1, 1, 1)
        else:
            start = date(start.year, start.month + 1, 1)
    raise AssertionError('could not find free payroll period')


def _create_monthly_run(
    client: httpx.Client,
    headers: dict[str, str],
) -> tuple[dict, str, date, date]:
    emp = _employee_id(client, headers)
    rate_from = _next_free_base_from(client, headers, emp)
    start, end = _next_free_run_period(client, headers, prefer_start=rate_from)
    # Rate must cover the run period
    rate = client.post(
        '/api/employee-rates',
        headers=headers,
        json={
            'employee_id': emp,
            'rate': 50000,
            'valid_from': start.isoformat(),
            'payment_scheme': 'monthly',
        },
    )
    assert rate.status_code == 201, rate.text
    created = client.post(
        '/api/payroll-runs',
        headers=headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    return created.json(), emp, start, end


def _salary_expenses_for_lines(
    client: httpx.Client,
    headers: dict[str, str],
    line_ids: set[str],
) -> list[dict]:
    expenses = client.get('/api/expenses', headers=headers)
    assert expenses.status_code == 200, expenses.text
    return [
        row
        for row in expenses.json()
        if row.get('category') == 'salary'
        and row.get('payroll_run_line_id') in line_ids
    ]


def test_confirm_creates_salary_expenses(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    run, emp, start, end = _create_monthly_run(client, admin_headers)
    line = next(
        row
        for row in run['lines']
        if row['employee_id'] == emp and row['payment_scheme'] == 'monthly'
    )
    confirmed = client.post(
        f"/api/payroll-runs/{run['id']}/confirm",
        headers=admin_headers,
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()['status'] == 'confirmed'

    linked = _salary_expenses_for_lines(client, admin_headers, {line['id']})
    assert len(linked) == 1
    expense = linked[0]
    assert expense['employee_id'] == emp
    assert float(expense['amount']) == pytest.approx(float(line['total_amount']))
    assert expense['date'] == end.isoformat()
    assert 'Начисление ЗП' in (expense.get('description') or '')
    assert start.strftime('%d.%m.%Y') in (expense.get('description') or '')


def test_reconfirm_rejected_no_duplicate_expense(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    run, emp, _start, _end = _create_monthly_run(client, admin_headers)
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    first = client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers)
    assert first.status_code == 200, first.text
    second = client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers)
    assert second.status_code == 400, second.text
    assert 'подтвержд' in second.text.lower()
    linked = _salary_expenses_for_lines(client, admin_headers, {line['id']})
    assert len(linked) == 1


def test_unconfirm_deletes_expenses(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    run, emp, _start, _end = _create_monthly_run(client, admin_headers)
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    assert (
        client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers).status_code
        == 200
    )
    assert _salary_expenses_for_lines(client, admin_headers, {line['id']})

    unconfirm = client.post(
        f"/api/payroll-runs/{run['id']}/unconfirm",
        headers=admin_headers,
    )
    assert unconfirm.status_code == 200, unconfirm.text
    assert unconfirm.json()['status'] == 'draft'
    assert unconfirm.json()['confirmed_at'] is None
    assert not _salary_expenses_for_lines(client, admin_headers, {line['id']})


def test_unconfirm_blocked_when_payout_exists(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Insert payout via DB session using API org's run line (no public payout API yet)."""
    from sqlalchemy import create_engine, text
    from app.config import settings

    run, emp, _start, _end = _create_monthly_run(client, admin_headers)
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    assert (
        client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers).status_code
        == 200
    )

    # Sync insert into payroll_payouts (tests use same DATABASE_URL).
    engine = create_engine(settings.DATABASE_URL.replace('+asyncpg', ''))
    with engine.begin() as conn:
        org_id = conn.execute(
            text('SELECT org_id FROM payroll_runs WHERE id = :id'),
            {'id': run['id']},
        ).scalar_one()
        conn.execute(
            text(
                """
                INSERT INTO payroll_payouts (
                  id, org_id, payroll_run_line_id, employee_id,
                  amount_paid, payout_method, payout_date
                ) VALUES (
                  gen_random_uuid(), :org_id, :line_id, :employee_id,
                  100, 'cash', CURRENT_DATE
                )
                """
            ),
            {'org_id': org_id, 'line_id': line['id'], 'employee_id': emp},
        )

    blocked = client.post(
        f"/api/payroll-runs/{run['id']}/unconfirm",
        headers=admin_headers,
    )
    assert blocked.status_code == 400, blocked.text
    assert 'выдач' in blocked.text.lower()
    # Expense must remain
    assert len(_salary_expenses_for_lines(client, admin_headers, {line['id']})) == 1


def test_crosscheck_salary_expenses_match_confirmed_lines(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    import asyncio
    from uuid import UUID

    from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

    from app.config import settings
    from app.services.payroll_expenses import crosscheck_salary_expenses_vs_confirmed_lines

    run, _emp, start, end = _create_monthly_run(client, admin_headers)
    assert (
        client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers).status_code
        == 200
    )

    async def _check():
        engine = create_async_engine(settings.DATABASE_URL)
        Session = async_sessionmaker(engine, expire_on_commit=False)
        try:
            async with Session() as db:
                return await crosscheck_salary_expenses_vs_confirmed_lines(
                    db,
                    org_id=UUID(run['org_id']),
                    period_start=start,
                    period_end=end,
                )
        finally:
            await engine.dispose()

    result = asyncio.run(_check())
    assert result['match'] is True
    assert float(result['salary_expenses_total']) == pytest.approx(
        float(result['confirmed_lines_total'])
    )
