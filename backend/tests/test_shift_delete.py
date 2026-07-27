"""Hard-delete shifts with linked agro facts (admin only)."""

from __future__ import annotations

from datetime import date

import httpx


def _emp_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    emp = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert emp.status_code == 200, emp.text
    return {'Authorization': f"Bearer {emp.json()['access_token']}"}


def _field_work(client: httpx.Client, headers: dict[str, str]) -> tuple[str, str, str]:
    fields = client.get('/api/fields', headers=headers)
    assert fields.status_code == 200 and fields.json(), fields.text
    locs = client.get('/api/locations', headers=headers, params={'is_active': True})
    assert locs.status_code == 200 and locs.json(), locs.text
    wts = client.get('/api/work-types', headers=headers, params={'is_active': True})
    assert wts.status_code == 200 and wts.json(), wts.text
    work = next((item for item in wts.json() if item.get('is_field_work')), None)
    assert work is not None, 'need field work type'
    return str(fields.json()[0]['id']), str(locs.json()[0]['id']), str(work['id'])


def _close_all_open(client: httpx.Client, headers: dict[str, str]) -> None:
    listed = client.get('/api/shifts', headers=headers, params={'status': 'open'})
    assert listed.status_code == 200, listed.text
    for row in listed.json():
        if row.get('status') == 'open':
            client.post(
                f"/api/shifts/{row['id']}/close",
                headers=headers,
                json={'description': 'pre-clean'},
            )


def test_manager_cannot_delete_shift(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp_headers = _emp_headers(client, demo_org_id)
    field_id, location_id, work_type_id = _field_work(client, manager_headers)
    _close_all_open(client, manager_headers)

    opened = client.post(
        '/api/shifts',
        headers=emp_headers,
        json={
            'location_id': location_id,
            'work_type_id': work_type_id,
            'field_id': field_id,
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']

    denied = client.delete(f'/api/shifts/{shift_id}', headers=manager_headers)
    assert denied.status_code == 403, denied.text

    deleted = client.delete(f'/api/shifts/{shift_id}', headers=admin_headers)
    assert deleted.status_code == 204, deleted.text


def test_admin_deletes_shift_with_agro_fact(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp_headers = _emp_headers(client, demo_org_id)
    field_id, location_id, work_type_id = _field_work(client, manager_headers)
    _close_all_open(client, manager_headers)

    opened = client.post(
        '/api/shifts',
        headers=emp_headers,
        json={
            'location_id': location_id,
            'work_type_id': work_type_id,
            'field_id': field_id,
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp_headers,
        json={'description': 'Полевые работы'},
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

    deleted = client.delete(f'/api/shifts/{shift_id}', headers=admin_headers)
    assert deleted.status_code == 204, deleted.text

    missing = client.get(f'/api/shifts/{shift_id}', headers=admin_headers)
    assert missing.status_code == 404, missing.text

    plans_after = client.get('/api/agro-plan', headers=manager_headers, params={'month': month})
    assert plans_after.status_code == 200, plans_after.text
    leftover = [row for row in plans_after.json() if row.get('id') == facts[0]['id']]
    assert leftover == []


def test_admin_delete_reopens_completed_plan(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    emp_headers = _emp_headers(client, demo_org_id)
    field_id, location_id, work_type_id = _field_work(client, manager_headers)
    _close_all_open(client, manager_headers)

    plan = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_id],
            'work_type_id': work_type_id,
            'planned_date': date.today().isoformat(),
        },
    )
    assert plan.status_code == 201, plan.text
    plan_id = plan.json()['id']

    opened = client.post(
        '/api/shifts',
        headers=emp_headers,
        json={
            'location_id': location_id,
            'work_type_id': work_type_id,
            'field_id': field_id,
            'agro_plan_id': plan_id,
        },
    )
    assert opened.status_code == 201, opened.text
    shift_id = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp_headers,
        json={'description': 'По плану'},
    )
    assert closed.status_code == 200, closed.text

    month = date.today().strftime('%Y-%m')
    done = client.get('/api/agro-plan', headers=manager_headers, params={'month': month})
    match = next(row for row in done.json() if row['id'] == plan_id)
    assert match['status'] == 'done'

    deleted = client.delete(f'/api/shifts/{shift_id}', headers=admin_headers)
    assert deleted.status_code == 204, deleted.text

    after = client.get('/api/agro-plan', headers=manager_headers, params={'month': month})
    match2 = next(row for row in after.json() if row['id'] == plan_id)
    assert match2['status'] == 'planned'
    assert match2['actual_shift_id'] is None

    client.delete(f'/api/agro-plan/{plan_id}', headers=manager_headers)
