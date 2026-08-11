"""Advance from draft payroll run + payout_kind semantics."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import httpx


def _parse_d(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    rows = client.get(
        '/api/employees', headers=headers, params={'is_active': True}
    ).json()
    assert rows
    preferred = next(
        (
            r
            for r in rows
            if str(r.get('employee_code') or '').startswith('EMP')
            and r.get('employee_code') != 'EMP000'
        ),
        None,
    )
    return str((preferred or rows[0])['id'])


def _next_window(client: httpx.Client, headers: dict[str, str], employee_id: str) -> tuple[date, date]:
    listed = client.get(
        '/api/employee-rates',
        headers=headers,
        params={'employee_id': employee_id},
    )
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    latest = date(2065, 1, 1)
    for row in rows:
        if row.get('work_type_id') is not None:
            continue
        for key in ('valid_from', 'valid_to'):
            d = _parse_d(row.get(key))
            if d:
                latest = max(latest, d)
    runs = client.get('/api/payroll-runs', headers=headers).json()
    for run in runs:
        pe = _parse_d(run.get('period_end'))
        if pe:
            latest = max(latest, pe)
    start = latest + timedelta(days=2 + (uuid4().int % 3))
    close_to = start - timedelta(days=1)
    for row in rows:
        if row.get('work_type_id') is not None or row.get('valid_to') is not None:
            continue
        vf = _parse_d(row.get('valid_from'))
        if vf is None or vf > close_to:
            continue
        client.patch(
            f"/api/employee-rates/{row['id']}",
            headers=headers,
            json={'valid_to': close_to.isoformat()},
        )
    return start, start + timedelta(days=27)


def test_advance_from_draft_run_does_not_change_total(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    start, end = _next_window(client, admin_headers, employee_id)
    rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'rate': 50_000,
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
    run_id = run['id']
    line = next(l for l in run['lines'] if l['employee_id'] == employee_id)
    total_before = float(line['total_amount'])

    adv = client.post(
        f'/api/payroll-runs/{run_id}/advances',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'amount_paid': 10_000,
            'payout_method': 'cash',
            'payout_date': start.isoformat(),
            'comment': 'аванс из начисления',
        },
    )
    assert adv.status_code == 201, adv.text
    body = adv.json()
    assert body['payout_kind'] == 'advance'
    assert body['payroll_run_line_id'] == line['id']

    detail = client.get(f'/api/payroll-runs/{run_id}', headers=admin_headers).json()
    line_after = next(l for l in detail['lines'] if l['employee_id'] == employee_id)
    assert abs(float(line_after['total_amount']) - total_before) < 0.05
    assert abs(float(line_after['amount_paid']) - 10_000) < 0.05
    assert abs(float(line_after['amount_advance']) - 10_000) < 0.05
    assert abs(float(line_after['remainder_amount']) - (total_before - 10_000)) < 0.05
