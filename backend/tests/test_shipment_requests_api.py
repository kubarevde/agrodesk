"""API tests for shipment requests + inventory expense on complete."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import httpx
import pytest


def _create_item(client: httpx.Client, headers: dict[str, str], *, stock: float) -> str:
    response = client.post(
        '/api/inventory',
        headers=headers,
        json={
            'name': f'ShipReq ТМЦ {uuid4().hex[:8]}',
            'category': 'other',
            'unit': 'кг',
            'current_stock': stock,
            'min_stock': 0,
            'total_capacity': 10000,
        },
    )
    assert response.status_code == 201, response.text
    return str(response.json()['id'])


def _create_request(
    client: httpx.Client,
    headers: dict[str, str],
    *,
    item_id: str,
    quantity: float = 10,
    price: float = 100,
) -> dict:
    planned = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    response = client.post(
        '/api/shipment-requests',
        headers=headers,
        json={
            'customer_name': 'ООО ТестПокупатель',
            'inventory_item_id': item_id,
            'quantity': quantity,
            'price': price,
            'planned_at': planned,
            'priority': 'normal',
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_create_shipment_request(client: httpx.Client, admin_headers: dict[str, str]) -> None:
    item_id = _create_item(client, admin_headers, stock=50)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=12, price=55)
    assert row['status'] == 'new'
    assert row['inventory_item_id'] == item_id
    assert float(row['quantity']) == 12
    assert row['created_by']
    assert row['inventory_operation_id'] is None


def test_complete_creates_inventory_expense(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, admin_headers, stock=100)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=25, price=40)

    started = client.post(f"/api/shipment-requests/{row['id']}/start", headers=admin_headers)
    assert started.status_code == 200, started.text
    assert started.json()['status'] == 'in_progress'

    done = client.post(f"/api/shipment-requests/{row['id']}/complete", headers=admin_headers, json={})
    assert done.status_code == 200, done.text
    body = done.json()
    assert body['status'] == 'done'
    assert body['completed_at']
    assert body['inventory_operation_id']

    ops = client.get(
        '/api/inventory/operations',
        headers=admin_headers,
        params={'item_id': item_id, 'type': 'expense'},
    )
    assert ops.status_code == 200, ops.text
    match = next((op for op in ops.json() if op['id'] == body['inventory_operation_id']), None)
    assert match is not None
    assert match['type'] == 'expense'
    assert float(match['quantity']) == 25
    assert match['purpose'] == 'shipment_request'
    assert 'Заявка на отгрузку' in (match.get('reason') or '')

    item = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert item.status_code == 200
    assert float(item.json()['current_stock']) == pytest.approx(75)


def test_complete_blocked_when_insufficient_stock(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    """Complete fails if stock dropped after create/start; request stays in_progress."""
    item_id = _create_item(client, admin_headers, stock=20)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=20)
    assert (
        client.post(f"/api/shipment-requests/{row['id']}/start", headers=admin_headers).status_code
        == 200
    )

    # Drain stock after request is in progress.
    drain = client.post(
        '/api/inventory/operations',
        headers=admin_headers,
        json={
            'item_id': item_id,
            'type': 'expense',
            'quantity': 15,
            'purpose': 'general',
            'date': datetime.now(timezone.utc).date().isoformat(),
        },
    )
    assert drain.status_code == 201, drain.text

    failed = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert failed.status_code == 400, failed.text
    detail = failed.json().get('detail', '')
    assert 'Недостаточно товара для выполнения заявки' in detail or 'Недостаточно запасов' in detail

    again = client.get(f"/api/shipment-requests/{row['id']}", headers=admin_headers)
    assert again.status_code == 200
    assert again.json()['status'] == 'in_progress'
    assert again.json()['inventory_operation_id'] is None

    item = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert float(item.json()['current_stock']) == pytest.approx(5)


def test_create_with_zero_stock_no_expense_complete_after_income(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    """Harvest-later: create at zero stock → complete blocked → income → complete ok once."""
    item_id = _create_item(client, admin_headers, stock=0)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=40, price=15)
    assert row['status'] == 'new'
    assert row.get('inventory_operation_id') is None

    stock0 = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert float(stock0.json()['current_stock']) == pytest.approx(0)

    ops_before = client.get(
        '/api/inventory/operations',
        headers=admin_headers,
        params={'item_id': item_id, 'type': 'expense'},
    )
    assert ops_before.status_code == 200
    assert not any(op.get('purpose') == 'shipment_request' for op in ops_before.json())

    assert (
        client.post(f"/api/shipment-requests/{row['id']}/start", headers=admin_headers).status_code
        == 200
    )

    blocked = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert blocked.status_code == 400, blocked.text
    assert 'Недостаточно товара для выполнения заявки' in blocked.json().get('detail', '')

    income = client.post(
        '/api/inventory/operations',
        headers=admin_headers,
        json={
            'item_id': item_id,
            'type': 'income',
            'quantity': 40,
            'purpose': 'general',
            'date': datetime.now(timezone.utc).date().isoformat(),
        },
    )
    assert income.status_code == 201, income.text

    done = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert done.status_code == 200, done.text
    body = done.json()
    assert body['status'] == 'done'
    op_id = body['inventory_operation_id']
    assert op_id

    ops = client.get(
        '/api/inventory/operations',
        headers=admin_headers,
        params={'item_id': item_id, 'type': 'expense'},
    )
    matches = [op for op in ops.json() if op['id'] == op_id]
    assert len(matches) == 1
    assert float(matches[0]['quantity']) == 40
    assert matches[0]['purpose'] == 'shipment_request'

    stock_after = client.get(f'/api/inventory/{item_id}', headers=admin_headers)
    assert float(stock_after.json()['current_stock']) == pytest.approx(0)

    second = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert second.status_code in (400, 409)


def test_shipment_requests_org_isolation(
    client: httpx.Client, admin_headers: dict[str, str], demo_org_id: str
) -> None:
    item_id = _create_item(client, admin_headers, stock=30)
    row = _create_request(client, admin_headers, item_id=item_id)

    orgs = client.get('/api/auth/orgs')
    assert orgs.status_code == 200
    other = next(
        (o for o in orgs.json() if o['id'] != demo_org_id and o.get('slug') == 'test-farm'),
        None,
    )
    if other is None:
        pytest.skip('test-farm org not seeded')

    login = client.post(
        '/api/auth/login',
        json={'email': 'EMP-TEST', 'password': '1234', 'org_id': other['id']},
    )
    assert login.status_code == 200, login.text
    other_headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

    listed = client.get('/api/shipment-requests', headers=other_headers)
    assert listed.status_code == 200, listed.text
    assert all(item['id'] != row['id'] for item in listed.json())

    missing = client.get(f"/api/shipment-requests/{row['id']}", headers=other_headers)
    assert missing.status_code == 404


def _employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _grant_employee_shipments(client: httpx.Client, admin_headers: dict[str, str]) -> None:
    current = client.get('/api/settings/role-permissions', headers=admin_headers)
    assert current.status_code == 200, current.text
    perms = dict(current.json()['permissions'])
    employee_sections = list(perms.get('employee', []))
    if 'shipments' not in employee_sections:
        employee_sections.append('shipments')
    perms['employee'] = employee_sections
    updated = client.patch(
        '/api/settings/role-permissions',
        headers=admin_headers,
        json={'permissions': perms},
    )
    assert updated.status_code == 200, updated.text


def test_executor_sees_only_unassigned_or_own(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    _grant_employee_shipments(client, admin_headers)
    emp_headers = _employee_headers(client, demo_org_id)
    me = client.get('/api/auth/me', headers=emp_headers)
    assert me.status_code == 200
    emp_id = str(me.json()['id'])

    perms = client.get('/api/auth/permissions', headers=emp_headers)
    assert perms.status_code == 200, perms.text
    actions = perms.json().get('actions') or []
    assert 'shipment_requests.execute' in actions
    # Execute-only (no manage) must be filtered even without mine_only.
    assert 'shipment_requests.manage' not in actions

    employees = client.get('/api/employees', headers=admin_headers, params={'is_active': True})
    assert employees.status_code == 200
    # Prefer a concrete other employee (not the executor).
    other = next(
        (
            e
            for e in employees.json()
            if str(e['id']) != emp_id and e.get('employee_code') not in (None, 'EMP001', 'EMP000')
        ),
        None,
    )
    assert other is not None, 'Need another active employee for assignment test'

    item_id = _create_item(client, admin_headers, stock=80)
    open_row = _create_request(client, admin_headers, item_id=item_id, quantity=5)
    foreign = _create_request(client, admin_headers, item_id=item_id, quantity=6)
    assigned = client.post(
        f"/api/shipment-requests/{foreign['id']}/assign",
        headers=admin_headers,
        json={'assigned_to': other['id']},
    )
    assert assigned.status_code == 200, assigned.text
    assert str(assigned.json()['assigned_to']) == str(other['id'])
    assert str(assigned.json()['assigned_to']) != emp_id

    listed = client.get('/api/shipment-requests', headers=emp_headers, params={'mine_only': 'true'})
    assert listed.status_code == 200, listed.text
    rows = listed.json()
    for row in rows:
        assert row['assigned_to'] is None or str(row['assigned_to']) == emp_id, row
    ids = {row['id'] for row in rows}
    assert open_row['id'] in ids
    foreign_listed = next((r for r in rows if r['id'] == foreign['id']), None)
    assert foreign_listed is None, (
        f'foreign visible to executor: {foreign_listed}; '
        f'assign_resp={assigned.json().get("assigned_to")}; me={emp_id}; other={other["id"]}'
    )

    denied = client.get(f"/api/shipment-requests/{foreign['id']}", headers=emp_headers)
    assert denied.status_code == 403, denied.text


def test_complete_with_attachment_urls(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, admin_headers, stock=40)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=4, price=10)
    assert (
        client.post(f"/api/shipment-requests/{row['id']}/start", headers=admin_headers).status_code
        == 200
    )
    done = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={'image_urls': ['/uploads/shipment-requests/demo.jpg']},
    )
    assert done.status_code == 200, done.text
    body = done.json()
    assert body['status'] == 'done'
    assert body['inventory_operation_id']
    assert len(body.get('attachments') or []) == 1
    assert body['attachments'][0]['image_url'] == '/uploads/shipment-requests/demo.jpg'


def test_list_filters_by_status(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, admin_headers, stock=50)
    created = _create_request(client, admin_headers, item_id=item_id, quantity=3)
    listed = client.get(
        '/api/shipment-requests',
        headers=admin_headers,
        params={'status': 'new'},
    )
    assert listed.status_code == 200, listed.text
    ids = {row['id'] for row in listed.json()}
    assert created['id'] in ids
    assert all(row['status'] == 'new' for row in listed.json() if row['id'] == created['id'])


def test_cancel_does_not_create_inventory_operation(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, admin_headers, stock=60)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=8)
    stock_before = float(
        client.get(f'/api/inventory/{item_id}', headers=admin_headers).json()['current_stock']
    )

    cancelled = client.post(
        f"/api/shipment-requests/{row['id']}/cancel",
        headers=admin_headers,
        json={'reason': 'Тестовая отмена без списания'},
    )
    assert cancelled.status_code == 200, cancelled.text
    body = cancelled.json()
    assert body['status'] == 'cancelled'
    assert body['inventory_operation_id'] is None

    ops = client.get(
        '/api/inventory/operations',
        headers=admin_headers,
        params={'item_id': item_id, 'type': 'expense'},
    )
    assert ops.status_code == 200
    assert not any(
        (op.get('purpose') == 'shipment_request' and row['id'] in (op.get('reason') or ''))
        for op in ops.json()
    )

    stock_after = float(
        client.get(f'/api/inventory/{item_id}', headers=admin_headers).json()['current_stock']
    )
    assert stock_after == pytest.approx(stock_before)

    # Cannot cancel again
    again = client.post(
        f"/api/shipment-requests/{row['id']}/cancel",
        headers=admin_headers,
        json={'reason': 'повтор'},
    )
    assert again.status_code == 400


def test_complete_creates_exactly_one_expense_operation(
    client: httpx.Client, admin_headers: dict[str, str]
) -> None:
    item_id = _create_item(client, admin_headers, stock=90)
    row = _create_request(client, admin_headers, item_id=item_id, quantity=15, price=12)
    assert (
        client.post(f"/api/shipment-requests/{row['id']}/start", headers=admin_headers).status_code
        == 200
    )
    done = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert done.status_code == 200, done.text
    op_id = done.json()['inventory_operation_id']

    ops = client.get(
        '/api/inventory/operations',
        headers=admin_headers,
        params={'item_id': item_id, 'type': 'expense'},
    )
    matches = [op for op in ops.json() if op['id'] == op_id]
    assert len(matches) == 1
    assert float(matches[0]['quantity']) == 15
    assert matches[0]['purpose'] == 'shipment_request'

    # Second complete must fail (already done)
    second = client.post(
        f"/api/shipment-requests/{row['id']}/complete",
        headers=admin_headers,
        json={},
    )
    assert second.status_code in (400, 409)
