"""Prompt #5: payroll.* action gates (confirm / manage_rates / catalog)."""

from __future__ import annotations

from calendar import monthrange
from datetime import date
from uuid import uuid4

import httpx


def _unique_month() -> tuple[date, date]:
    month = 1 + (uuid4().int % 12)
    year = 2040 + (uuid4().int % 3)
    start = date(year, month, 1)
    end = date(year, month, monthrange(year, month)[1])
    return start, end


def _create_draft_run(client: httpx.Client, headers: dict[str, str]) -> str:
    start, end = _unique_month()
    # Avoid overlap with existing runs: retry a few months ahead.
    for _ in range(24):
        created = client.post(
            '/api/payroll-runs',
            headers=headers,
            json={'period_start': start.isoformat(), 'period_end': end.isoformat()},
        )
        if created.status_code == 201:
            return created.json()['id']
        if start.month == 12:
            start = date(start.year + 1, 1, 1)
        else:
            start = date(start.year, start.month + 1, 1)
        end = date(start.year, start.month, monthrange(start.year, start.month)[1])
    raise AssertionError('could not create draft payroll run')


def test_access_groups_catalog_includes_payroll(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    listed = client.get('/api/settings/access-groups', headers=admin_headers)
    assert listed.status_code == 200, listed.text
    keys = {row['key'] for row in listed.json()['actions']}
    assert 'payroll.confirm' in keys
    assert 'payroll.pay' in keys
    assert 'payroll.manage_rates' in keys
    assert 'payroll.view_all' in keys
    labels = {row['key']: row['label'] for row in listed.json()['actions']}
    assert 'Оплата' in labels['payroll.confirm'] or 'начисл' in labels['payroll.confirm'].lower()


def test_manager_cannot_confirm_without_grant(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    run_id = _create_draft_run(client, admin_headers)
    denied = client.post(
        f'/api/payroll-runs/{run_id}/confirm',
        headers=manager_headers,
    )
    assert denied.status_code == 403, denied.text


def test_manager_can_confirm_after_group_grant(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    employees = client.get('/api/employees', headers=admin_headers)
    assert employees.status_code == 200, employees.text
    manager = next(e for e in employees.json() if e.get('employee_code') == 'EMP003')

    group = client.post(
        '/api/settings/access-groups',
        headers=admin_headers,
        json={
            'name': f'Payroll confirm {uuid4().hex[:6]}',
            'sections': ['dashboard', 'worktime', 'employees'],
            'actions': ['payroll.confirm'],
            'member_ids': [manager['id']],
        },
    )
    assert group.status_code == 201, group.text
    group_id = group.json()['id']

    try:
        run_id = _create_draft_run(client, admin_headers)
        ok = client.post(
            f'/api/payroll-runs/{run_id}/confirm',
            headers=manager_headers,
        )
        assert ok.status_code == 200, ok.text
        assert ok.json()['status'] == 'confirmed'
    finally:
        # Detach manager so other tests keep role-default permissions.
        client.patch(
            f'/api/settings/access-groups/{group_id}',
            headers=admin_headers,
            json={'member_ids': []},
        )


def test_manager_cannot_create_rate_without_manage_rates(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    employees = client.get('/api/employees', headers=manager_headers)
    assert employees.status_code == 200, employees.text
    emp_id = employees.json()[0]['id']
    denied = client.post(
        '/api/employee-rates',
        headers=manager_headers,
        json={
            'employee_id': emp_id,
            'rate': 100,
            'valid_from': date(2099, 1, 1).isoformat(),
            'payment_scheme': 'hourly',
        },
    )
    assert denied.status_code == 403, denied.text
