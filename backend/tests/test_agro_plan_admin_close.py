"""Admin close agro plans without a linked shift."""

from __future__ import annotations

from datetime import date

import httpx


def _field_and_work_type(client: httpx.Client, headers: dict[str, str]) -> tuple[str, str]:
    fields = client.get('/api/fields', headers=headers)
    assert fields.status_code == 200 and fields.json(), fields.text
    wts = client.get('/api/work-types', headers=headers, params={'is_active': True})
    assert wts.status_code == 200 and wts.json(), wts.text
    return str(fields.json()[0]['id']), str(wts.json()[0]['id'])


def test_admin_close_plan_sets_closed_by(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    field_id, work_type_id = _field_and_work_type(client, manager_headers)
    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_id],
            'work_type_id': work_type_id,
            'planned_date': date.today().isoformat(),
        },
    )
    assert created.status_code == 201, created.text
    plan_id = created.json()['id']

    denied = client.post(
        f'/api/agro-plan/{plan_id}/close',
        headers=manager_headers,
        json={'status': 'done', 'note': 'менеджер'},
    )
    assert denied.status_code == 403, denied.text

    closed = client.post(
        f'/api/agro-plan/{plan_id}/close',
        headers=admin_headers,
        json={'status': 'done', 'note': 'Закрыто админом без смены'},
    )
    assert closed.status_code == 200, closed.text
    body = closed.json()
    assert body['status'] == 'done'
    assert body['closed_by'] is not None
    assert body['closed_by_name']
    assert body['closed_at'] is not None
    assert body['close_note'] == 'Закрыто админом без смены'

    client.delete(f'/api/agro-plan/{plan_id}', headers=manager_headers)


def test_admin_can_cancel_any_open_plan(
    client: httpx.Client,
    admin_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    field_id, work_type_id = _field_and_work_type(client, manager_headers)
    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_id],
            'work_type_id': work_type_id,
            'planned_date': date.today().isoformat(),
        },
    )
    assert created.status_code == 201, created.text
    plan_id = created.json()['id']

    cancelled = client.post(
        f'/api/agro-plan/{plan_id}/close',
        headers=admin_headers,
        json={'status': 'cancelled'},
    )
    assert cancelled.status_code == 200, cancelled.text
    assert cancelled.json()['status'] == 'cancelled'
    assert cancelled.json()['closed_by'] is not None

    client.delete(f'/api/agro-plan/{plan_id}', headers=admin_headers)


def test_manager_patch_status_records_closed_by(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    field_id, work_type_id = _field_and_work_type(client, manager_headers)
    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_id],
            'work_type_id': work_type_id,
            'planned_date': date.today().isoformat(),
        },
    )
    assert created.status_code == 201, created.text
    plan_id = created.json()['id']

    patched = client.patch(
        f'/api/agro-plan/{plan_id}',
        headers=manager_headers,
        json={'status': 'cancelled'},
    )
    assert patched.status_code == 200, patched.text
    body = patched.json()
    assert body['status'] == 'cancelled'
    assert body['closed_by'] is not None
    assert body['closed_at'] is not None

    client.delete(f'/api/agro-plan/{plan_id}', headers=manager_headers)
