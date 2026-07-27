"""Purchase planner API tests."""

from __future__ import annotations

from datetime import date

import httpx


def _equipment_id(client: httpx.Client, headers: dict[str, str]) -> str:
    r = client.get('/api/equipment', headers=headers)
    assert r.status_code == 200, r.text
    assert r.json(), 'need equipment'
    return str(r.json()[0]['id'])


def _implement_id(client: httpx.Client, headers: dict[str, str]) -> str | None:
    r = client.get('/api/implements', headers=headers)
    if r.status_code != 200 or not r.json():
        return None
    return str(r.json()[0]['id'])


def _inventory_id(client: httpx.Client, headers: dict[str, str]) -> str | None:
    r = client.get('/api/inventory', headers=headers, params={'is_active': True})
    if r.status_code != 200 or not r.json():
        return None
    return str(r.json()[0]['id'])


def test_category_validation_requires_equipment_id(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    bad = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={'title': 'Фильтр', 'category': 'equipment'},
    )
    assert bad.status_code == 422, bad.text

    eq = _equipment_id(client, manager_headers)
    ok = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={
            'title': 'Фильтр масла',
            'category': 'equipment',
            'equipment_id': eq,
            'urgency': 'urgent',
        },
    )
    assert ok.status_code == 201, ok.text
    assert ok.json()['equipment_id'] == eq
    assert ok.json()['category'] == 'equipment'


def test_create_all_categories(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    general = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={'title': 'Канцтовары', 'category': 'general', 'urgency': 'low'},
    )
    assert general.status_code == 201, general.text

    impl = _implement_id(client, manager_headers)
    if impl:
        r = client.post(
            '/api/purchase-planner',
            headers=manager_headers,
            json={
                'title': 'Подшипник',
                'category': 'implement',
                'implement_id': impl,
            },
        )
        assert r.status_code == 201, r.text

    inv = _inventory_id(client, manager_headers)
    if inv:
        r = client.post(
            '/api/purchase-planner',
            headers=manager_headers,
            json={
                'title': 'Докупить ТМЦ',
                'category': 'inventory_item',
                'inventory_item_id': inv,
                'urgency': 'normal',
            },
        )
        assert r.status_code == 201, r.text


def test_mark_purchased_creates_expense(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    created = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={
            'title': 'Смазка',
            'category': 'general',
            'estimated_cost': 1500,
            'urgency': 'normal',
        },
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    patched = client.patch(
        f'/api/purchase-planner/{item_id}',
        headers=manager_headers,
        json={
            'status': 'purchased',
            'actual_cost': 1600,
            'create_expense': True,
            'expense_category': 'parts',
        },
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body['status'] == 'purchased'
    assert body['expense_id'] is not None
    assert body['purchased_at'] is not None


def test_urgent_endpoint_only_planned_urgent(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    urgent = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={'title': 'Срочный болт', 'category': 'general', 'urgency': 'urgent'},
    )
    assert urgent.status_code == 201, urgent.text
    normal = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={'title': 'Обычный болт', 'category': 'general', 'urgency': 'normal'},
    )
    assert normal.status_code == 201, normal.text

    listed = client.get('/api/purchase-planner/urgent', headers=manager_headers)
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    assert all(r['urgency'] == 'urgent' and r['status'] == 'planned' for r in rows)
    assert any(r['title'] == 'Срочный болт' for r in rows)
    assert all(r['title'] != 'Обычный болт' for r in rows)


def test_from_maintenance_checklist(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    eq = _equipment_id(client, manager_headers)
    repair = client.post(
        '/api/equipment-maintenance',
        headers=manager_headers,
        json={
            'equipment_id': eq,
            'date': date.today().isoformat(),
            'type': 'Ремонт',
            'priority': 'urgent',
            'checklist_items': [
                {'item_type': 'buy', 'description': 'Ремень ГРМ', 'cost': 3000},
            ],
        },
    )
    assert repair.status_code == 201, repair.text
    item_id = repair.json()['checklist_items'][0]['id']

    linked = client.post(
        f'/api/equipment-maintenance/checklist-items/{item_id}/to-purchase-planner',
        headers=manager_headers,
    )
    assert linked.status_code == 201, linked.text
    body = linked.json()
    assert body['title'] == 'Ремень ГРМ'
    assert body['category'] == 'equipment'
    assert body['equipment_id'] == eq
    assert body['maintenance_checklist_item_id'] == item_id
    assert body['maintenance_id'] == repair.json()['id']
    assert body['urgency'] == 'urgent'

    dup = client.post(
        f'/api/equipment-maintenance/checklist-items/{item_id}/to-purchase-planner',
        headers=manager_headers,
    )
    assert dup.status_code == 409, dup.text


def _employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _grant_employee_purchase_planner(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    current = client.get('/api/settings/role-permissions', headers=admin_headers)
    assert current.status_code == 200, current.text
    perms = dict(current.json()['permissions'])
    employee_sections = list(perms.get('employee', []))
    if 'purchase-planner' not in employee_sections:
        employee_sections.append('purchase-planner')
    perms['employee'] = employee_sections
    updated = client.patch(
        '/api/settings/role-permissions',
        headers=admin_headers,
        json={'permissions': perms},
    )
    assert updated.status_code == 200, updated.text


def test_employee_with_grant_can_list_and_create(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    _grant_employee_purchase_planner(client, admin_headers)
    emp_headers = _employee_headers(client, demo_org_id)

    listed = client.get('/api/purchase-planner', headers=emp_headers)
    assert listed.status_code == 200, listed.text

    created = client.post(
        '/api/purchase-planner',
        headers=emp_headers,
        json={'title': 'Перчатки', 'category': 'general', 'urgency': 'normal'},
    )
    assert created.status_code == 201, created.text
    assert created.json()['status'] == 'planned'

    forbidden = client.delete(
        f"/api/purchase-planner/{created.json()['id']}",
        headers=emp_headers,
    )
    assert forbidden.status_code == 403, forbidden.text


def test_employee_mark_purchased_without_expense(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    _grant_employee_purchase_planner(client, admin_headers)
    emp_headers = _employee_headers(client, demo_org_id)

    created = client.post(
        '/api/purchase-planner',
        headers=emp_headers,
        json={'title': 'Скотч', 'category': 'general', 'estimated_cost': 250},
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    patched = client.patch(
        f'/api/purchase-planner/{item_id}',
        headers=emp_headers,
        json={
            'status': 'purchased',
            'actual_cost': 300,
            'create_expense': True,
            'images': ['/uploads/purchase-planner/demo.jpg'],
        },
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body['status'] == 'purchased'
    assert body['expense_id'] is None
    assert body['images'] == ['/uploads/purchase-planner/demo.jpg']


def test_revert_purchased_deletes_linked_expense(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    created = client.post(
        '/api/purchase-planner',
        headers=manager_headers,
        json={'title': 'Фильтр салона', 'category': 'general', 'estimated_cost': 900},
    )
    assert created.status_code == 201, created.text
    item_id = created.json()['id']

    purchased = client.patch(
        f'/api/purchase-planner/{item_id}',
        headers=manager_headers,
        json={
            'status': 'purchased',
            'actual_cost': 950,
            'create_expense': True,
            'expense_category': 'parts',
        },
    )
    assert purchased.status_code == 200, purchased.text
    expense_id = purchased.json()['expense_id']
    assert expense_id is not None

    reverted = client.patch(
        f'/api/purchase-planner/{item_id}',
        headers=manager_headers,
        json={'status': 'planned'},
    )
    assert reverted.status_code == 200, reverted.text
    body = reverted.json()
    assert body['status'] == 'planned'
    assert body['expense_id'] is None
    assert body['purchased_at'] is None
    assert body['actual_cost'] is None

    expense = client.get(f'/api/expenses/{expense_id}', headers=manager_headers)
    assert expense.status_code == 404, expense.text
