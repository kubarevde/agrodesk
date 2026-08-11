"""API checks for payment_scheme validation and base-rate auto-close (Prompt #1).

Uses a dedicated far-future window on an existing employee (org may be at employee limit).
"""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

import httpx
import pytest


def _employee_id(client: httpx.Client, headers: dict[str, str]) -> str:
    rows = client.get('/api/employees', headers=headers).json()
    assert rows
    return rows[0]['id']


def _parse_d(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def _next_free_from(
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
    latest = date(2048, 1, 1)
    rows = listed.json()
    for row in rows:
        if row.get('work_type_id') is not None:
            continue
        vf = _parse_d(row.get('valid_from'))
        vt = _parse_d(row.get('valid_to'))
        if vf:
            latest = max(latest, vf)
        if vt:
            latest = max(latest, vt)
    start = latest + timedelta(days=2 + (uuid4().int % 3))
    close_to = start - timedelta(days=1)
    for row in rows:
        if row.get('work_type_id') is not None or row.get('valid_to') is not None:
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
    return start


def test_create_hourly_rate_returns_scheme(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    valid_from = _next_free_from(client, admin_headers, employee_id)
    created = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'rate': 275,
            'valid_from': valid_from.isoformat(),
            'payment_scheme': 'hourly',
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['payment_scheme'] == 'hourly'
    assert body.get('piecework_unit') is None


def test_create_per_shift_with_work_type_rejected(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    work_types = client.get('/api/work-types', headers=admin_headers)
    assert work_types.status_code == 200, work_types.text
    wt = work_types.json()[0]['id']
    res = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'work_type_id': wt,
            'payment_scheme': 'per_shift',
            'rate': 3000,
            'valid_from': date.today().isoformat(),
        },
    )
    assert res.status_code == 422, res.text


def test_create_base_rate_closes_previous_open_base(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    employee_id = _employee_id(client, admin_headers)
    base = _next_free_from(client, admin_headers, employee_id)
    first_from = base.isoformat()
    second_from = (base + timedelta(days=10)).isoformat()

    first = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'rate': 200,
            'valid_from': first_from,
            'payment_scheme': 'hourly',
        },
    )
    assert first.status_code == 201, first.text
    first_id = first.json()['id']

    second = client.post(
        '/api/employee-rates',
        headers=admin_headers,
        json={
            'employee_id': employee_id,
            'rate': 220,
            'valid_from': second_from,
            'payment_scheme': 'monthly',
        },
    )
    assert second.status_code == 201, second.text

    listed = client.get(
        '/api/employee-rates',
        headers=admin_headers,
        params={'employee_id': employee_id},
    )
    assert listed.status_code == 200, listed.text
    by_id = {row['id']: row for row in listed.json()}
    assert by_id[first_id]['valid_to'] == (base + timedelta(days=9)).isoformat()
    assert by_id[second.json()['id']]['valid_to'] is None
