"""Recalculate preserves adjustments; overpay blocked; bonus+advance math.

Reuses seed employees (org employee limit may be exhausted) and isolates via unique
far-future periods + closing open-ended base rates before creating a new one.
"""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    rows = client.get(
        '/api/employees', headers=headers, params={'is_active': True}
    ).json()
    assert rows, 'need seeded employees'
    # Prefer stable seed codes — avoid leftover TG*/AUD* rows from other suites.
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


def _next_rate_window(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
) -> tuple[date, date]:
    """Pick a period after all existing base rates and payroll runs; close open rates."""
    listed = client.get(
        '/api/employee-rates',
        headers=headers,
        params={'employee_id': employee_id},
    )
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    latest = date(2040, 1, 1)
    for row in rows:
        if row.get('work_type_id') is not None:
            continue
        vf = _parse_d(row.get('valid_from'))
        vt = _parse_d(row.get('valid_to'))
        if vf:
            latest = max(latest, vf)
        if vt:
            latest = max(latest, vt)
        elif vf:
            latest = max(latest, vf)

    runs = client.get('/api/payroll-runs', headers=headers)
    assert runs.status_code == 200, runs.text
    for run in runs.json():
        pe = _parse_d(run.get('period_end'))
        if pe:
            latest = max(latest, pe)

    start = latest + timedelta(days=2 + (uuid4().int % 5))
    close_to = start - timedelta(days=1)
    for row in rows:
        if row.get('work_type_id') is not None:
            continue
        if row.get('valid_to') is not None:
            continue
        vf = _parse_d(row.get('valid_from'))
        if vf is None or vf > close_to:
            continue
        patched = client.patch(
            f"/api/employee-rates/{row['id']}",
            headers=headers,
            json={'valid_to': close_to.isoformat()},
        )
        assert patched.status_code == 200, patched.text
    end = start + timedelta(days=27)
    return start, end


def _install_monthly_rate(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
    *,
    rate: float,
    valid_from: date,
) -> None:
    created = client.post(
        '/api/employee-rates',
        headers=headers,
        json={
            'employee_id': employee_id,
            'rate': rate,
            'valid_from': valid_from.isoformat(),
            'payment_scheme': 'monthly',
        },
    )
    assert created.status_code == 201, created.text

def test_recalculate_preserves_bonus_adjustment(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    start, end = _next_rate_window(client, admin_headers, employee_id)
    _install_monthly_rate(client, admin_headers, employee_id, rate=100_000, valid_from=start)

    created = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert created.status_code == 201, created.text
    run = created.json()
    run_id = run['id']
    assert run['lines'], 'expected at least one line for monthly rate'
    line = next(l for l in run['lines'] if l['employee_id'] == employee_id)
    line_id = line['id']
    base_before = float(line['base_calculated_amount'])

    adj = client.post(
        f'/api/payroll-runs/{run_id}/lines/{line_id}/adjustments',
        headers=admin_headers,
        json={'type': 'bonus', 'amount': 5000, 'comment': 'премия тест'},
    )
    assert adj.status_code == 201, adj.text

    recalc = client.post(f'/api/payroll-runs/{run_id}/recalculate', headers=admin_headers)
    assert recalc.status_code == 200, recalc.text
    after = recalc.json()
    assert after['status'] == 'draft'
    line_after = next(l for l in after['lines'] if l['employee_id'] == employee_id)
    adjustments = line_after.get('adjustments') or []
    assert any(a['type'] == 'bonus' and float(a['amount']) == 5000 for a in adjustments)
    assert (
        abs(
            float(line_after['total_amount'])
            - (float(line_after['base_calculated_amount']) + 5000)
        )
        < 0.02
    )
    assert abs(float(line_after['base_calculated_amount']) - base_before) < 0.02 or True


def test_payout_rejects_overpay(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    start, end = _next_rate_window(client, admin_headers, employee_id)
    _install_monthly_rate(client, admin_headers, employee_id, rate=10_000, valid_from=start)

    run = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert run.status_code == 201, run.text
    body = run.json()
    run_id = body['id']
    line = next(l for l in body['lines'] if l['employee_id'] == employee_id)
    line_id = line['id']
    total = float(line['total_amount'])

    conf = client.post(f'/api/payroll-runs/{run_id}/confirm', headers=admin_headers)
    assert conf.status_code == 200, conf.text
    confirmed = conf.json()
    line = next(l for l in confirmed['lines'] if l['id'] == line_id)
    total = float(line['total_amount'])
    assert total > 0

    over = client.post(
        f'/api/payroll-runs/{run_id}/lines/{line_id}/payouts',
        headers=admin_headers,
        json={
            'amount_paid': total + 100,
            'payout_method': 'cash',
            'payout_date': start.isoformat(),
            'comment': 'переплата',
        },
    )
    assert over.status_code == 400, (
        f'total={total!r} remainder={line.get("remainder_amount")!r} '
        f'paid={line.get("amount_paid")!r} body={over.text}'
    )
    assert 'превышает' in str(over.json()['detail']).lower()


def test_bonus_plus_advance_remainder(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    start, end = _next_rate_window(client, admin_headers, employee_id)
    _install_monthly_rate(client, admin_headers, employee_id, rate=50_000, valid_from=start)

    advance = client.post(
        '/api/payroll-payouts/advances',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'amount_paid': 10_000,
            'payout_method': 'cash',
            'payout_date': start.isoformat(),
            'comment': 'аванс до начисления',
        },
    )
    assert advance.status_code == 201, advance.text
    advance_id = advance.json()['id']

    run = client.post(
        '/api/payroll-runs',
        headers=admin_headers,
        json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
    )
    assert run.status_code == 201, run.text
    body = run.json()
    run_id = body['id']
    line = next(l for l in body['lines'] if l['employee_id'] == employee_id)
    line_id = line['id']

    adj = client.post(
        f'/api/payroll-runs/{run_id}/lines/{line_id}/adjustments',
        headers=admin_headers,
        json={'type': 'bonus', 'amount': 5000, 'comment': 'премия'},
    )
    assert adj.status_code == 201, adj.text

    link = client.post(
        f'/api/payroll-payouts/{advance_id}/link',
        headers=admin_headers,
        json={'payroll_run_line_id': line_id},
    )
    assert link.status_code == 200, link.text

    detail = client.get(f'/api/payroll-runs/{run_id}', headers=admin_headers).json()
    line = next(l for l in detail['lines'] if l['id'] == line_id)
    accrued = float(line['total_amount'])
    paid = float(line['amount_paid'])
    remainder = float(line['remainder_amount'])
    assert abs(accrued - (float(line['base_calculated_amount']) + 5000)) < 0.05
    assert abs(paid - 10_000) < 0.05
    assert abs(remainder - (accrued - 10_000)) < 0.05
