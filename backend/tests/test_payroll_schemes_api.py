"""API checks for piecework close + scheme pay behaviour (Prompt #2)."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


def _pick_work_type_without_override(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
) -> str:
    """Prefer a non-field work type without employee-specific rate override."""
    work_types = client.get('/api/work-types', headers=headers)
    assert work_types.status_code == 200, work_types.text
    rates = client.get(
        '/api/employee-rates',
        headers=headers,
        params={'employee_id': employee_id},
    )
    assert rates.status_code == 200, rates.text
    overridden = {
        str(row['work_type_id'])
        for row in rates.json()
        if row.get('work_type_id') is not None
    }
    candidates = [
        wt
        for wt in work_types.json()
        if not wt.get('is_field_work') and str(wt['id']) not in overridden
    ]
    if not candidates:
        candidates = [wt for wt in work_types.json() if not wt.get('is_field_work')]
    assert candidates, 'need a non-field work type for manual shift tests'
    return str(candidates[0]['id'])


@pytest.fixture
def refs(client: httpx.Client, admin_headers: dict[str, str]) -> dict[str, str]:
    employees = client.get(
        '/api/employees', headers=admin_headers, params={'is_active': True}
    )
    assert employees.status_code == 200, employees.text
    rows = employees.json()
    assert rows, 'need at least one employee'
    preferred = next(
        (
            r
            for r in rows
            if str(r.get('employee_code') or '').startswith('EMP')
            and r.get('employee_code') != 'EMP000'
        ),
        None,
    )
    emp = str((preferred or rows[0])['id'])

    locations = client.get('/api/locations', headers=admin_headers)
    assert locations.status_code == 200, locations.text
    loc = locations.json()[0]['id']
    wt = _pick_work_type_without_override(client, admin_headers, emp)
    return {'employee_id': emp, 'work_type_id': wt, 'location_id': loc}


def _next_free_base_from(
    client: httpx.Client,
    headers: dict[str, str],
    employee_id: str,
) -> date:
    """Pick a start date after all existing base-rate bounds for this employee."""
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
    # Extra jitter avoids collisions across parallel/local re-runs.
    offset = 30 + (uuid4().int % 40)
    if not bounds:
        return date.today() + timedelta(days=offset)
    return max(bounds) + timedelta(days=offset)


def _create_base_rate(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    employee_id: str,
    scheme: str,
    rate: float,
    valid_from: date,
    unit: str | None = None,
) -> None:
    body: dict[str, object] = {
        'employee_id': employee_id,
        'rate': rate,
        'valid_from': valid_from.isoformat(),
        'payment_scheme': scheme,
    }
    if unit:
        body['piecework_unit'] = unit
    created = client.post('/api/employee-rates', headers=headers, json=body)
    assert created.status_code == 201, created.text


def _manual_shift(
    client: httpx.Client,
    headers: dict[str, str],
    refs: dict[str, str],
    shift_date: date,
) -> dict:
    payload = {
        'employee_id': refs['employee_id'],
        'date': shift_date.isoformat(),
        'start_time': '08:00:00',
        'end_time': '18:00:00',
        'location_id': refs['location_id'],
        'work_type_id': refs['work_type_id'],
        'description': 'Тестовая смена для схем оплаты',
    }
    created = client.post('/api/shifts/manual', headers=headers, json=payload)
    assert created.status_code in (200, 201), created.text
    return created.json()


def test_manual_shift_per_shift_fixed_amount(
    client: httpx.Client,
    admin_headers: dict[str, str],
    refs: dict[str, str],
) -> None:
    day = _next_free_base_from(client, admin_headers, refs['employee_id'])
    _create_base_rate(
        client,
        admin_headers,
        employee_id=refs['employee_id'],
        scheme='per_shift',
        rate=4200,
        valid_from=day,
    )
    body = _manual_shift(client, admin_headers, refs, day)
    assert float(body['calculated_amount']) == 4200.0
    snap = body.get('rate_snapshot') or {}
    assert snap.get('payment_scheme') == 'per_shift'


def test_manual_shift_monthly_amount_null(
    client: httpx.Client,
    admin_headers: dict[str, str],
    refs: dict[str, str],
) -> None:
    day = _next_free_base_from(client, admin_headers, refs['employee_id'])
    _create_base_rate(
        client,
        admin_headers,
        employee_id=refs['employee_id'],
        scheme='monthly',
        rate=90000,
        valid_from=day,
    )
    body = _manual_shift(client, admin_headers, refs, day)
    assert body.get('calculated_amount') is None
    snap = body.get('rate_snapshot') or {}
    assert snap.get('source') == 'monthly_scheme'
    assert snap.get('payment_scheme') == 'monthly'


def test_piecework_standalone_create(
    client: httpx.Client,
    admin_headers: dict[str, str],
    refs: dict[str, str],
) -> None:
    day = _next_free_base_from(client, admin_headers, refs['employee_id'])
    # Work-type-specific piecework wins priority and avoids unrelated base hourly rows.
    created_rate = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': refs['employee_id'],
            'work_type_id': refs['work_type_id'],
            'rate': 1500,
            'valid_from': day.isoformat(),
            'payment_scheme': 'piecework',
            'piecework_unit': 'га',
        },
    )
    assert created_rate.status_code == 201, created_rate.text
    created = client.post(
        '/api/piecework-records',
        headers=admin_headers,
        json={
            'employee_id': refs['employee_id'],
            'work_type_id': refs['work_type_id'],
            'quantity': 12.5,
            'unit': 'га',
            'date': day.isoformat(),
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert float(body['rate_applied']) == 1500.0
    assert float(body['calculated_amount']) == 18750.0
