"""Section grants must open modules for employees (not only managers)."""

from __future__ import annotations

import httpx


def _employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _grant_employee_sections(
    client: httpx.Client,
    admin_headers: dict[str, str],
    *sections: str,
) -> None:
    current = client.get('/api/settings/role-permissions', headers=admin_headers)
    assert current.status_code == 200, current.text
    perms = dict(current.json()['permissions'])
    employee_sections = list(perms.get('employee', []))
    for section in sections:
        if section not in employee_sections:
            employee_sections.append(section)
    perms['employee'] = employee_sections
    updated = client.patch(
        '/api/settings/role-permissions',
        headers=admin_headers,
        json={'permissions': perms},
    )
    assert updated.status_code == 200, updated.text


def test_employee_with_maintenance_can_list_repairs(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    _grant_employee_sections(client, admin_headers, 'maintenance')
    emp = _employee_headers(client, demo_org_id)

    listed = client.get('/api/equipment-maintenance', headers=emp)
    assert listed.status_code == 200, listed.text
    assert isinstance(listed.json(), list)

    # Mutations stay manager-only
    created = client.post(
        '/api/equipment-maintenance',
        headers=emp,
        json={
            'equipment_id': None,
            'implement_id': None,
            'date': '2026-07-01',
            'description': 'employee cannot create',
            'priority': 'normal',
            'status': 'in_progress',
        },
    )
    assert created.status_code == 403, created.text


def test_manager_permissions_without_dashboard(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    current = client.get('/api/settings/role-permissions', headers=admin_headers)
    assert current.status_code == 200, current.text
    perms = dict(current.json()['permissions'])
    manager_sections = [s for s in perms.get('manager', []) if s != 'dashboard']
    if 'purchase-planner' not in manager_sections:
        manager_sections.append('purchase-planner')
    perms['manager'] = manager_sections
    updated = client.patch(
        '/api/settings/role-permissions',
        headers=admin_headers,
        json={'permissions': perms},
    )
    assert updated.status_code == 200, updated.text

    me = client.get('/api/auth/permissions', headers=manager_headers)
    assert me.status_code == 200, me.text
    allowed = me.json()['allowed_sections']
    assert 'dashboard' not in allowed
    assert 'purchase-planner' in allowed

    purchases = client.get('/api/purchase-planner', headers=manager_headers)
    assert purchases.status_code == 200, purchases.text
