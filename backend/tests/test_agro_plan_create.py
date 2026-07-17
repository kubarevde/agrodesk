"""Integration: POST /api/agro-plan create must not 500 (MissingGreenlet regression).

Requires running API + Demo seed:
  cd backend && alembic upgrade head && python -m app.seed
  pytest tests/test_agro_plan_create.py -q
"""

from __future__ import annotations

from datetime import date, timedelta

import httpx
import pytest


def _active_fields(client: httpx.Client, headers: dict[str, str]) -> list[dict]:
    r = client.get('/api/fields', headers=headers)
    assert r.status_code == 200, r.text
    return [f for f in r.json() if f.get('is_active', True)]


def _active_work_type(client: httpx.Client, headers: dict[str, str]) -> dict:
    r = client.get('/api/work-types', headers=headers)
    assert r.status_code == 200, r.text
    wt = next((w for w in r.json() if w.get('is_active', True)), None)
    assert wt, 'no active work types'
    return wt


def test_create_agro_plan_single_field(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    fields = _active_fields(client, manager_headers)
    if not fields:
        pytest.skip('no fields')
    wt = _active_work_type(client, manager_headers)
    planned = (date.today() + timedelta(days=3)).isoformat()

    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [fields[0]['id']],
            'work_type_id': wt['id'],
            'planned_date': planned,
            'notes': 'pytest create single',
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['field_ids'] == [fields[0]['id']]
    assert body.get('field_names')
    assert body['notes'] == 'pytest create single'

    patched = client.patch(
        f"/api/agro-plan/{body['id']}",
        headers=manager_headers,
        json={'notes': 'pytest edit after create'},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()['notes'] == 'pytest edit after create'

    deleted = client.delete(f"/api/agro-plan/{body['id']}", headers=manager_headers)
    assert deleted.status_code == 204, deleted.text


def test_create_agro_plan_multiple_fields(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    fields = _active_fields(client, manager_headers)
    if len(fields) < 2:
        pytest.skip('need at least 2 fields')
    wt = _active_work_type(client, manager_headers)
    planned = (date.today() + timedelta(days=4)).isoformat()
    field_ids = [fields[0]['id'], fields[1]['id']]

    implements = client.get('/api/implements', headers=manager_headers)
    implement_id = None
    if implements.status_code == 200 and implements.json():
        implement_id = implements.json()[0]['id']

    payload: dict = {
        'field_ids': field_ids,
        'work_type_id': wt['id'],
        'planned_date': planned,
        'notes': 'pytest multi fields',
    }
    if implement_id:
        payload['implement_id'] = implement_id

    created = client.post('/api/agro-plan', headers=manager_headers, json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['field_ids'] == field_ids
    assert len(body.get('field_names') or []) == 2

    deleted = client.delete(f"/api/agro-plan/{body['id']}", headers=manager_headers)
    assert deleted.status_code == 204, deleted.text


def test_create_agro_plan_legacy_field_id(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    fields = _active_fields(client, manager_headers)
    if not fields:
        pytest.skip('no fields')
    wt = _active_work_type(client, manager_headers)
    planned = (date.today() + timedelta(days=5)).isoformat()

    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_id': fields[0]['id'],
            'work_type_id': wt['id'],
            'planned_date': planned,
        },
    )
    assert created.status_code == 201, created.text
    body = created.json()
    assert body['field_ids'] == [fields[0]['id']]

    deleted = client.delete(f"/api/agro-plan/{body['id']}", headers=manager_headers)
    assert deleted.status_code == 204, deleted.text
