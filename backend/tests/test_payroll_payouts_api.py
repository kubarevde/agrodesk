"""API tests for payroll payouts (Prompt #6)."""

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
    offset = 80 + (uuid4().int % 80)
    if not bounds:
        return date.today() + timedelta(days=offset)
    return max(bounds) + timedelta(days=offset)


def _next_free_run_period(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    prefer_start: date,
) -> tuple[date, date]:
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
    for _ in range(48):
        end = date(start.year, start.month, monthrange(start.year, start.month)[1])
        if end < start:
            end = start
        if not overlaps(start, end):
            return start, end
        if start.month == 12:
            start = date(start.year + 1, 1, 1)
        else:
            start = date(start.year, start.month + 1, 1)
    raise AssertionError('could not find free payroll period')


def _create_confirmed_monthly_run(
    client: httpx.Client,
    headers: dict[str, str],
) -> tuple[dict, str]:
    emp = _employee_id(client, headers)
    rate_from = _next_free_base_from(client, headers, emp)
    start, end = _next_free_run_period(client, headers, prefer_start=rate_from)
    rate = client.post(
        '/api/employee-rates',
        headers=headers,
        json={
            'employee_id': emp,
            'rate': 10000,
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
    run = created.json()
    confirmed = client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=headers)
    assert confirmed.status_code == 200, confirmed.text
    return confirmed.json(), emp


def test_partial_payouts_update_status_and_run_paid(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    run, emp = _create_confirmed_monthly_run(client, admin_headers)
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    total = float(line['total_amount'])
    assert total > 0

    first = client.post(
        f"/api/payroll-runs/{run['id']}/lines/{line['id']}/payouts",
        headers=admin_headers,
        json={
            'amount_paid': round(total / 2, 2),
            'payout_method': 'cash',
            'payout_date': date.today().isoformat(),
            'comment': 'Часть наличными',
        },
    )
    assert first.status_code == 201, first.text

    sheet = client.get(
        f"/api/payroll-runs/{run['id']}/payout-sheet",
        headers=admin_headers,
    )
    assert sheet.status_code == 200, sheet.text
    row = next(r for r in sheet.json()['lines'] if r['line_id'] == line['id'])
    assert row['payout_status'] == 'partially_paid'
    assert float(row['amount_paid']) == pytest.approx(total / 2, abs=0.02)

    second = client.post(
        f"/api/payroll-runs/{run['id']}/lines/{line['id']}/payouts",
        headers=admin_headers,
        json={
            'amount_paid': float(row['remainder_amount']),
            'payout_method': 'bank_transfer',
            'payout_date': date.today().isoformat(),
        },
    )
    assert second.status_code == 201, second.text

    # If other employees remain unpaid, run may stay confirmed — settle all lines.
    sheet2 = client.get(
        f"/api/payroll-runs/{run['id']}/payout-sheet",
        headers=admin_headers,
    )
    assert sheet2.status_code == 200, sheet2.text
    for sline in sheet2.json()['lines']:
        if sline['payout_status'] == 'paid':
            continue
        rem = float(sline['remainder_amount'])
        if rem <= 0:
            continue
        pay = client.post(
            f"/api/payroll-runs/{run['id']}/lines/{sline['line_id']}/payouts",
            headers=admin_headers,
            json={
                'amount_paid': rem,
                'payout_method': 'cash',
                'payout_date': date.today().isoformat(),
            },
        )
        assert pay.status_code == 201, pay.text

    final = client.get(f"/api/payroll-runs/{run['id']}", headers=admin_headers)
    assert final.status_code == 200, final.text
    assert final.json()['status'] == 'paid'
    my = next(r for r in final.json()['lines'] if r['id'] == line['id'])
    assert my['payout_status'] == 'paid'


def test_advance_before_run_links_and_reduces_remainder(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    emp = _employee_id(client, admin_headers)
    rate_from = _next_free_base_from(client, admin_headers, emp)
    start, end = _next_free_run_period(client, admin_headers, prefer_start=rate_from)

    advance = client.post(
        '/api/payroll-payouts/advances',
        headers=admin_headers,
        json={
            'employee_id': emp,
            'amount_paid': 1500,
            'payout_method': 'cash',
            'payout_date': (start - timedelta(days=1)).isoformat(),
            'comment': 'Аванс за период до начисления',
        },
    )
    assert advance.status_code == 201, advance.text
    assert advance.json()['payroll_run_line_id'] is None

    rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': emp,
            'rate': 10000,
            'valid_from': start.isoformat(),
            'payment_scheme': 'monthly',
        },
    )
    assert rate.status_code == 201, rate.text

    created = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    run = created.json()
    assert any(a['id'] == advance.json()['id'] for a in run.get('unlinked_advances', []))

    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    linked = client.post(
        f"/api/payroll-payouts/{advance.json()['id']}/link",
        headers=admin_headers,
        json={'payroll_run_line_id': line['id']},
    )
    assert linked.status_code == 200, linked.text
    assert linked.json()['payroll_run_line_id'] == line['id']

    confirmed = client.post(f"/api/payroll-runs/{run['id']}/confirm", headers=admin_headers)
    assert confirmed.status_code == 200, confirmed.text

    sheet = client.get(
        f"/api/payroll-runs/{run['id']}/payout-sheet",
        headers=admin_headers,
    )
    assert sheet.status_code == 200, sheet.text
    row = next(r for r in sheet.json()['lines'] if r['line_id'] == line['id'])
    assert float(row['amount_paid']) == pytest.approx(1500)
    assert row['payout_status'] == 'partially_paid'
    assert float(row['remainder_amount']) == pytest.approx(float(line['total_amount']) - 1500)


def test_payout_on_draft_forbidden(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    emp = _employee_id(client, admin_headers)
    rate_from = _next_free_base_from(client, admin_headers, emp)
    start, end = _next_free_run_period(client, admin_headers, prefer_start=rate_from)
    rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': emp,
            'rate': 8000,
            'valid_from': start.isoformat(),
            'payment_scheme': 'monthly',
        },
    )
    assert rate.status_code == 201, rate.text
    created = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    run = created.json()
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    denied = client.post(
        f"/api/payroll-runs/{run['id']}/lines/{line['id']}/payouts",
        headers=admin_headers,
        json={
            'amount_paid': 100,
            'payout_method': 'cash',
            'payout_date': date.today().isoformat(),
        },
    )
    assert denied.status_code == 400, denied.text


def test_manager_without_pay_gets_403(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    run, emp = _create_confirmed_monthly_run(client, admin_headers)
    line = next(row for row in run['lines'] if row['employee_id'] == emp)
    denied = client.post(
        f"/api/payroll-runs/{run['id']}/lines/{line['id']}/payouts",
        headers=manager_headers,
        json={
            'amount_paid': 100,
            'payout_method': 'cash',
            'payout_date': date.today().isoformat(),
        },
    )
    assert denied.status_code == 403, denied.text
