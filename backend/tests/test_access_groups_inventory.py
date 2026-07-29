"""Employee with inventory section can POST operations; without action → 403."""

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


def test_employee_inventory_operate_and_permissions_shape(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    _grant_employee_sections(client, admin_headers, 'inventory')
    emp = _employee_headers(client, demo_org_id)

    me = client.get('/api/auth/permissions', headers=emp)
    assert me.status_code == 200, me.text
    body = me.json()
    assert 'inventory' in body['allowed_sections']
    assert 'inventory.operate' in body['actions']
    assert 'actions' in body

    items = client.get('/api/inventory', headers=emp)
    assert items.status_code == 200, items.text
    rows = items.json()
    assert rows, 'seed inventory items expected'
    item_id = rows[0]['id']

    created = client.post(
        '/api/inventory/operations',
        headers=emp,
        json={
            'item_id': item_id,
            'type': 'income',
            'quantity': 1,
            'date': '2026-07-28',
            'reason': 'test grant',
        },
    )
    assert created.status_code == 201, created.text


def test_access_groups_list_includes_supplier(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    listed = client.get('/api/settings/access-groups', headers=admin_headers)
    assert listed.status_code == 200, listed.text
    groups = listed.json()['groups']
    assert any(g.get('code') == 'supplier' for g in groups)
