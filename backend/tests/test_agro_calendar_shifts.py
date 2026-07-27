"""Agro calendar ↔ shift integration tests."""

from __future__ import annotations

from datetime import date

import httpx


def _headers_employee(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _field_id(client: httpx.Client, headers: dict[str, str]) -> str:
    r = client.get('/api/fields', headers=headers)
    assert r.status_code == 200, r.text
    assert r.json(), 'need fields'
    return str(r.json()[0]['id'])


def _location_id(client: httpx.Client, headers: dict[str, str]) -> str:
    r = client.get('/api/locations', headers=headers, params={'is_active': True})
    assert r.status_code == 200, r.text
    assert r.json(), 'need locations'
    return str(r.json()[0]['id'])


def _work_types(client: httpx.Client, headers: dict[str, str]) -> list[dict]:
    r = client.get('/api/work-types', headers=headers, params={'is_active': True})
    assert r.status_code == 200, r.text
    return r.json()


def _field_work_type(client: httpx.Client, headers: dict[str, str]) -> dict:
    for item in _work_types(client, headers):
        if item.get('is_field_work'):
            return item
    # fallback: mark first as field work via admin? use manager patch
    raise AssertionError('need at least one field work type after migration')


def _non_field_work_type(client: httpx.Client, headers: dict[str, str]) -> dict:
    for item in _work_types(client, headers):
        if not item.get('is_field_work'):
            return item
    raise AssertionError('need at least one non-field work type')


def test_close_field_shift_without_plan_creates_fact(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    field_id = _field_id(client, manager_headers)
    location_id = _location_id(client, manager_headers)
    work_type = _field_work_type(client, manager_headers)
    emp = _headers_employee(client, demo_org_id)

    opened = client.post(
        '/api/shifts',
        headers=emp,
        json={
            'location_id': location_id,
            'work_type_id': work_type['id'],
            'field_id': field_id,
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp,
        json={'description': 'Полевые работы выполнены'},
    )
    assert closed.status_code == 200, closed.text

    month = date.today().strftime('%Y-%m')
    plans = client.get('/api/agro-plan', headers=manager_headers, params={'month': month})
    assert plans.status_code == 200, plans.text
    facts = [
        row
        for row in plans.json()
        if row.get('actual_shift_id') == shift_id and row.get('entry_kind') == 'fact'
    ]
    assert len(facts) == 1
    assert facts[0]['status'] == 'done'
    assert facts[0]['field_id'] == field_id


def test_close_with_selected_plan_marks_done(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    field_id = _field_id(client, manager_headers)
    location_id = _location_id(client, manager_headers)
    work_type = _field_work_type(client, manager_headers)

    plan = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_id],
            'work_type_id': work_type['id'],
            'planned_date': date.today().isoformat(),
        },
    )
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()['id']
    assert plan.json()['entry_kind'] == 'plan'

    emp = _headers_employee(client, demo_org_id)
    opened = client.post(
        '/api/shifts',
        headers=emp,
        json={
            'location_id': location_id,
            'work_type_id': work_type['id'],
            'field_id': field_id,
            'agro_plan_id': plan_id,
        },
    )
    assert opened.status_code == 201, opened.text
    assert opened.json()['agro_plan_id'] == plan_id
    shift_id = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp,
        json={'description': 'План выполнен по смене'},
    )
    assert closed.status_code == 200, closed.text

    updated = client.get('/api/agro-plan', headers=manager_headers, params={'month': date.today().strftime('%Y-%m')})
    assert updated.status_code == 200, updated.text
    matched = next(row for row in updated.json() if row['id'] == plan_id)
    assert matched['status'] == 'done'
    assert matched['actual_shift_id'] == shift_id
    assert matched['entry_kind'] == 'plan'


def test_non_field_shift_does_not_create_calendar_entry(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    location_id = _location_id(client, manager_headers)
    work_type = _non_field_work_type(client, manager_headers)
    emp = _headers_employee(client, demo_org_id)

    before = client.get(
        '/api/agro-plan',
        headers=manager_headers,
        params={'month': date.today().strftime('%Y-%m')},
    )
    assert before.status_code == 200, before.text
    before_ids = {row['id'] for row in before.json()}

    opened = client.post(
        '/api/shifts',
        headers=emp,
        json={
            'location_id': location_id,
            'work_type_id': work_type['id'],
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp,
        json={'description': 'Ремонт в боксе выполнен'},
    )
    assert closed.status_code == 200, closed.text

    after = client.get(
        '/api/agro-plan',
        headers=manager_headers,
        params={'month': date.today().strftime('%Y-%m')},
    )
    assert after.status_code == 200, after.text
    new_facts = [
        row
        for row in after.json()
        if row['id'] not in before_ids and row.get('actual_shift_id') == shift_id
    ]
    assert new_facts == []


def test_employee_can_list_fields_for_shift(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    emp = _headers_employee(client, demo_org_id)
    r = client.get('/api/fields', headers=emp)
    assert r.status_code == 200, r.text
    assert isinstance(r.json(), list)


def test_fact_cannot_be_patched_or_deleted(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    field_id = _field_id(client, manager_headers)
    location_id = _location_id(client, manager_headers)
    work_type = _field_work_type(client, manager_headers)
    emp = _headers_employee(client, demo_org_id)

    opened = client.post(
        '/api/shifts',
        headers=emp,
        json={
            'location_id': location_id,
            'work_type_id': work_type['id'],
            'field_id': field_id,
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']
    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp,
        json={'description': 'Создаём факт для запрета правок'},
    )
    assert closed.status_code == 200, closed.text

    plans = client.get(
        '/api/agro-plan',
        headers=manager_headers,
        params={'month': date.today().strftime('%Y-%m')},
    )
    fact = next(
        row
        for row in plans.json()
        if row.get('actual_shift_id') == shift_id and row.get('entry_kind') == 'fact'
    )

    patched = client.patch(
        f"/api/agro-plan/{fact['id']}",
        headers=manager_headers,
        json={'notes': 'нельзя'},
    )
    assert patched.status_code == 400, patched.text

    deleted = client.delete(f"/api/agro-plan/{fact['id']}", headers=manager_headers)
    assert deleted.status_code == 400, deleted.text


def test_manual_field_shift_creates_fact(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    field_id = _field_id(client, manager_headers)
    location_id = _location_id(client, manager_headers)
    work_type = _field_work_type(client, manager_headers)
    employees = client.get('/api/employees', headers=manager_headers, params={'is_active': True})
    assert employees.status_code == 200, employees.text
    employee_id = str(employees.json()[0]['id'])

    created = client.post(
        '/api/shifts/manual',
        headers=manager_headers,
        json={
            'employee_id': employee_id,
            'date': date.today().isoformat(),
            'start_time': '08:00:00',
            'end_time': '12:00:00',
            'location_id': location_id,
            'work_type_id': work_type['id'],
            'field_id': field_id,
            'description': 'Ручная полевая смена',
        },
    )
    assert created.status_code == 201, created.text
    shift_id = created.json()['id']

    plans = client.get(
        '/api/agro-plan',
        headers=manager_headers,
        params={'month': date.today().strftime('%Y-%m')},
    )
    facts = [
        row
        for row in plans.json()
        if row.get('actual_shift_id') == shift_id and row.get('entry_kind') == 'fact'
    ]
    assert len(facts) == 1
