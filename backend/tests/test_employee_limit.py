"""Employee create respects organization.max_employees."""

from __future__ import annotations

import os
from uuid import uuid4

import httpx
import pytest


def _superadmin_headers(client: httpx.Client) -> dict[str, str] | None:
    email = (os.environ.get('SUPERADMIN_EMAIL') or '').strip()
    password = (os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
    if not email or not password:
        return None
    r = client.post(
        '/superadmin/api/auth/login',
        json={'email': email, 'password': password},
    )
    if r.status_code != 200:
        return None
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def test_create_employee_blocked_at_max_employees(client: httpx.Client) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    slug = f'lim-{uuid4().hex[:8]}'
    create = client.post(
        '/superadmin/api/organizations',
        headers=staff,
        json={
            'name': f'Limit Org {slug}',
            'slug': slug,
            'owner_email': f'{slug}@example.com',
            'plan': 'basic',
            'max_employees': 1,
            'trial_ends_at': None,
        },
    )
    assert create.status_code == 201, create.text
    body = create.json()
    org = body['organization']
    org_id = org['id']
    assert org['max_employees'] == 1

    try:
        login = client.post(
            '/api/auth/login',
            json={
                'org_id': org_id,
                'email': f'ADM-{slug}'[:20],
                'password': body['temp_password'],
            },
        )
        assert login.status_code == 200, login.text
        headers = {'Authorization': f"Bearer {login.json()['access_token']}"}

        blocked = client.post(
            '/api/employees',
            headers=headers,
            json={
                'employee_code': 'E001',
                'full_name': 'Лишний',
                'position': 'Механизатор',
                'hourly_rate': 100,
                'role': 'employee',
                'password': 'secret123',
            },
        )
        assert blocked.status_code == 403, blocked.text
        assert 'лимит' in blocked.json()['detail'].lower()
    finally:
        client.delete(f'/superadmin/api/organizations/{org_id}', headers=staff)
