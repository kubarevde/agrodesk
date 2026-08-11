"""API checks for payroll runs (Prompt #3)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


def _unique_month() -> tuple[date, date]:
    month = 1 + (uuid4().int % 12)
    year = 2030 + (uuid4().int % 5)
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return start, end


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    rows = client.get('/api/employees', headers=headers)
    assert rows.status_code == 200, rows.text
    assert rows.json()
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
    offset = 40 + (uuid4().int % 50)
    if not bounds:
        return date.today() + timedelta(days=offset)
    return max(bounds) + timedelta(days=offset)


def test_create_run_and_block_overlap(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    start, end = _unique_month()
    created = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['status'] == 'draft'
    assert body['period_start'] == start.isoformat()

    overlap = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert overlap.status_code == 400, overlap.text


def test_other_adjustment_decreases_total(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    emp = _employee_id(client, admin_headers)
    start = _next_free_base_from(client, admin_headers, emp)
    end = date(start.year, start.month, monthrange(start.year, start.month)[1])
    if end < start:
        end = start

    rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': emp,
            'rate': 62000,
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
    assert run['lines'], 'expected monthly line for seeded rate'
    line = next(
        row
        for row in run['lines']
        if row['employee_id'] == emp and row['payment_scheme'] == 'monthly'
    )
    days = (end - start).days + 1
    expected_base = round(62000 * days / days, 2)
    base = float(line['base_calculated_amount'])
    assert base == pytest.approx(expected_base)

    adj = client.post(
        f"/api/payroll-runs/{run['id']}/lines/{line['id']}/adjustments",
        headers=admin_headers,
        json={
            'type': 'other',
            'amount': 150,
            'sign': -1,
            'comment': 'Удержание тест',
        },
    )
    assert adj.status_code == 201, adj.text

    refreshed = client.get(f"/api/payroll-runs/{run['id']}", headers=admin_headers)
    assert refreshed.status_code == 200, refreshed.text
    line2 = next(row for row in refreshed.json()['lines'] if row['id'] == line['id'])
    assert float(line2['adjustments_total']) == -150.0
    assert float(line2['total_amount']) == pytest.approx(base - 150.0)


def test_confirm_requires_admin_and_sets_status(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    start, end = _unique_month()
    created = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    run_id = created.json()['id']

    confirmed = client.post(
        f'/api/payroll-runs/{run_id}/confirm',
        headers=admin_headers,
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()['status'] == 'confirmed'
    assert confirmed.json()['confirmed_at'] is not None
