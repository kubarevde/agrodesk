"""Payroll control summary KPI rules + empty period."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


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


def _parse_d(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _next_window(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
) -> tuple[date, date]:
    listed = client.get(
        '/api/employee-rates',
        headers=headers,
        params={'employee_id': employee_id},
    )
    assert listed.status_code == 200
    latest = date(2070, 1, 1)
    for row in listed.json():
        if row.get('work_type_id') is not None:
            continue
        for key in ('valid_from', 'valid_to'):
            d = _parse_d(row.get(key))
            if d:
                latest = max(latest, d)
    runs = client.get('/api/payroll-runs', headers=headers)
    assert runs.status_code == 200
    for run in runs.json():
        pe = _parse_d(run.get('period_end'))
        if pe:
            latest = max(latest, pe)
    start = latest + timedelta(days=3 + (uuid4().int % 4))
    # close open rates
    close_to = start - timedelta(days=1)
    for row in listed.json():
        if row.get('work_type_id') is not None:
            continue
        if row.get('valid_to') is not None:
            continue
        vf = _parse_d(row.get('valid_from'))
        if vf is None or vf > close_to:
            continue
        assert (
            client.patch(
                f"/api/employee-rates/{row['id']}",
                headers=headers,
                json={'valid_to': close_to.isoformat()},
            ).status_code
            == 200
        )
    end = date(start.year, start.month, __import__('calendar').monthrange(start.year, start.month)[1])
    if end < start:
        end = start
    return start, end


def test_control_summary_draft_excluded_confirmed_included(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    emp = _employee_id(client, admin_headers)
    start, end = _next_window(client, admin_headers, emp)
    rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': emp,
            'rate': 80_000,
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
    line = next(l for l in run['lines'] if l['employee_id'] == emp)

    draft_summary = client.get(
        '/api/payroll-control/summary',
        headers=admin_headers,
        params={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert draft_summary.status_code == 200, draft_summary.text
    assert float(draft_summary.json()['kpi']['accrued']) == 0.0
    assert any(g['kind'] == 'draft_runs' for g in draft_summary.json()['attention'])

    confirmed = client.post(
        f"/api/payroll-runs/{run['id']}/confirm",
        headers=admin_headers,
    )
    assert confirmed.status_code == 200, confirmed.text

    summary = client.get(
        '/api/payroll-control/summary',
        headers=admin_headers,
        params={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert summary.status_code == 200, summary.text
    body = summary.json()
    assert float(body['kpi']['accrued']) > 0
    emp_row = next(r for r in body['employees'] if r['employee_id'] == emp)
    assert float(emp_row['accrued']) == pytest.approx(float(line['total_amount']))
    assert float(body['kpi']['paid']) == 0.0
    assert float(body['kpi']['remainder']) == pytest.approx(float(body['kpi']['accrued']))
    assert float(body['kpi']['expenses_posted']) == pytest.approx(float(body['kpi']['accrued']))
    assert any(g['kind'] == 'unpaid_confirmed' for g in body['attention'])
    assert not any(g['kind'] == 'missing_expense' for g in body['attention'])


def test_control_summary_empty_period_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    resp = client.get(
        '/api/payroll-control/summary',
        headers=admin_headers,
        params={'period_start': '2099-01-01', 'period_end': '2099-01-31'},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body['kpi'] == {
        'accrued': 0.0,
        'expenses_posted': 0.0,
        'paid': 0.0,
        'remainder': 0.0,
    }
    assert body['attention'] == []
    assert body['employees'] == []


def test_control_export_accruals_empty_ok(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    resp = client.post(
        '/api/payroll-control/export/accruals',
        headers=admin_headers,
        json={'period_start': '2099-02-01', 'period_end': '2099-02-28'},
    )
    assert resp.status_code == 200, resp.text
    assert 'spreadsheet' in resp.headers.get('content-type', '')


def test_control_rejects_inverted_period(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    resp = client.get(
        '/api/payroll-control/summary',
        headers=admin_headers,
        params={'period_start': '2026-08-31', 'period_end': '2026-08-01'},
    )
    assert resp.status_code == 400
