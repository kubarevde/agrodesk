"""Crop varieties API: child of org crop dictionary."""

from __future__ import annotations

import uuid

import httpx


def _employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _create_crop(client: httpx.Client, headers: dict[str, str]) -> dict:
    suffix = uuid.uuid4().hex[:6]
    created = client.post(
        '/api/dictionaries/crop',
        headers=headers,
        json={'name': f'Культура сорта {suffix}'},
    )
    assert created.status_code == 201, created.text
    return created.json()


def test_crop_varieties_crud_and_scope(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    crop_a = _create_crop(client, admin_headers)
    crop_b = _create_crop(client, admin_headers)

    missing_crop = client.post(
        '/api/crop-varieties',
        headers=admin_headers,
        json={'crop_code': f'no_such_{uuid.uuid4().hex[:8]}', 'name': 'Рен'},
    )
    assert missing_crop.status_code == 404, missing_crop.text

    created = client.post(
        '/api/crop-varieties',
        headers=admin_headers,
        json={'crop_code': crop_a['code'], 'name': 'Рен'},
    )
    assert created.status_code == 201, created.text
    variety = created.json()
    assert variety['crop_code'] == crop_a['code']
    assert variety['name'] == 'Рен'
    assert variety['is_active'] is True

    dup = client.post(
        '/api/crop-varieties',
        headers=admin_headers,
        json={'crop_code': crop_a['code'], 'name': 'Рен'},
    )
    assert dup.status_code == 409, dup.text

    same_name_other_crop = client.post(
        '/api/crop-varieties',
        headers=admin_headers,
        json={'crop_code': crop_b['code'], 'name': 'Рен'},
    )
    assert same_name_other_crop.status_code == 201, same_name_other_crop.text

    listed_a = client.get(
        '/api/crop-varieties',
        headers=admin_headers,
        params={'crop_code': crop_a['code']},
    )
    assert listed_a.status_code == 200
    names_a = {row['name'] for row in listed_a.json()}
    assert 'Рен' in names_a
    assert all(row['crop_code'] == crop_a['code'] for row in listed_a.json())

    listed_b = client.get(
        '/api/crop-varieties',
        headers=admin_headers,
        params={'crop_code': crop_b['code']},
    )
    assert listed_b.status_code == 200
    assert {row['name'] for row in listed_b.json()} == {'Рен'}
    assert same_name_other_crop.json()['id'] not in {row['id'] for row in listed_a.json()}

    renamed = client.patch(
        f"/api/crop-varieties/{variety['id']}",
        headers=admin_headers,
        json={'name': 'Рен обновлён'},
    )
    assert renamed.status_code == 200, renamed.text
    assert renamed.json()['name'] == 'Рен обновлён'

    deactivated = client.patch(
        f"/api/crop-varieties/{variety['id']}",
        headers=admin_headers,
        json={'is_active': False},
    )
    assert deactivated.status_code == 200, deactivated.text
    assert deactivated.json()['is_active'] is False

    active_only = client.get(
        '/api/crop-varieties',
        headers=admin_headers,
        params={'crop_code': crop_a['code'], 'is_active': True},
    )
    assert active_only.status_code == 200
    assert all(row['id'] != variety['id'] for row in active_only.json())

    all_rows = client.get(
        '/api/crop-varieties',
        headers=admin_headers,
        params={'crop_code': crop_a['code']},
    )
    assert any(row['id'] == variety['id'] and row['is_active'] is False for row in all_rows.json())

    usage = client.get(
        f"/api/crop-varieties/{variety['id']}/usage",
        headers=admin_headers,
    )
    assert usage.status_code == 200
    assert usage.json()['total'] == 0

    emp = _employee_headers(client, demo_org_id)
    forbidden = client.post(
        '/api/crop-varieties',
        headers=emp,
        json={'crop_code': crop_a['code'], 'name': 'Запрещённый'},
    )
    assert forbidden.status_code == 403, forbidden.text

    readable = client.get(
        '/api/crop-varieties',
        headers=emp,
        params={'crop_code': crop_a['code']},
    )
    assert readable.status_code == 200, readable.text
