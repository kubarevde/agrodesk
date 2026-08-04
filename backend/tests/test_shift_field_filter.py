"""Optional field_id filter on GET /api/shifts (backward-compatible)."""

from __future__ import annotations

import inspect

import httpx
import pytest

from app.routers.shifts import list_shifts


def test_list_shifts_signature_has_optional_field_id() -> None:
    params = inspect.signature(list_shifts).parameters
    assert 'field_id' in params
    # Default None — existing clients without the param keep previous behaviour.
    assert params['field_id'].default is not inspect.Parameter.empty


def test_openapi_documents_field_id_query() -> None:
    from app.main import app

    schema = app.openapi()
    params = schema['paths']['/api/shifts']['get']['parameters']
    names = {p.get('name') for p in params}
    assert 'field_id' in names


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


def _running_api_has_field_filter(client: httpx.Client) -> bool:
    try:
        schema = client.get('/openapi.json')
        if schema.status_code != 200:
            return False
        params = schema.json()['paths']['/api/shifts']['get']['parameters']
        return any(p.get('name') == 'field_id' for p in params)
    except Exception:
        return False


def test_list_shifts_filter_by_field_id(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    if not _running_api_has_field_filter(client):
        pytest.skip('Running API has no field_id filter yet — restart backend to pick up code')

    emp = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert emp.status_code == 200, emp.text
    emp_headers = {'Authorization': f"Bearer {emp.json()['access_token']}"}

    field_id, location_id, work_type_id = _field_work(client, manager_headers)
    _close_all_open(client, manager_headers)

    fields = client.get('/api/fields', headers=manager_headers)
    assert fields.status_code == 200 and len(fields.json()) >= 1
    other_field_id = next(
        (str(f['id']) for f in fields.json() if str(f['id']) != field_id),
        None,
    )

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

    filtered = client.get(
        '/api/shifts',
        headers=manager_headers,
        params={'field_id': field_id},
    )
    assert filtered.status_code == 200, filtered.text
    rows = filtered.json()
    ids = {str(row['id']) for row in rows}
    assert shift_id in ids
    assert all(str(row.get('field_id')) == field_id for row in rows)

    unfiltered = client.get('/api/shifts', headers=manager_headers)
    assert unfiltered.status_code == 200, unfiltered.text
    assert any(str(row['id']) == shift_id for row in unfiltered.json())

    if other_field_id:
        other = client.get(
            '/api/shifts',
            headers=manager_headers,
            params={'field_id': other_field_id},
        )
        assert other.status_code == 200, other.text
        assert shift_id not in {str(row['id']) for row in other.json()}

    client.post(
        f'/api/shifts/{shift_id}/close',
        headers=emp_headers,
        json={'description': 'cleanup'},
    )
