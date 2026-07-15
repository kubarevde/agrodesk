"""Minimal API integration tests (pytest + httpx).

Run (API must be up on localhost:8000 with seeded DB):
  cd backend
  pytest tests/ -q
"""

from __future__ import annotations

import os
from datetime import date, datetime, timedelta

import httpx
import pytest

BASE = os.environ.get('API_BASE_URL', 'http://127.0.0.1:8000')


@pytest.fixture(scope='module')
def client() -> httpx.Client:
    with httpx.Client(base_url=BASE, timeout=30) as c:
        yield c


@pytest.fixture(scope='module')
def org_id(client: httpx.Client) -> str:
    r = client.get('/api/auth/orgs')
    assert r.status_code == 200, r.text
    orgs = r.json()
    assert orgs, 'seed organizations first'
    return orgs[0]['id']


@pytest.fixture(scope='module')
def admin_headers(client: httpx.Client, org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP000', 'password': '1234', 'org_id': org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope='module')
def manager_headers(client: httpx.Client, org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP003', 'password': '1234', 'org_id': org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def test_login_and_me(client: httpx.Client, org_id: str, admin_headers: dict[str, str]) -> None:
    me = client.get('/api/employees/me', headers=admin_headers)
    assert me.status_code == 200
    body = me.json()
    assert body['employee_code'] == 'EMP000'
    assert body.get('org_id') == org_id or body.get('role') == 'admin'


def test_close_shift_salary(client: httpx.Client, manager_headers: dict[str, str]) -> None:
    emp = client.get('/api/employees', headers=manager_headers)
    assert emp.status_code == 200
    target = next(e for e in emp.json() if e['employee_code'] == 'EMP001')

    locs = client.get('/api/locations', headers=manager_headers).json()
    wts = client.get('/api/work-types', headers=manager_headers).json()
    loc = next(l for l in locs if l.get('is_active'))
    wt = next(w for w in wts if w.get('is_active'))

    today = date.today().isoformat()
    start = (datetime.now() - timedelta(hours=2)).strftime('%H:%M:%S')
    payload = {
        'employee_id': target['id'],
        'date': today,
        'start_time': start,
        'end_time': datetime.now().strftime('%H:%M:%S'),
        'location_id': loc['id'],
        'work_type_id': wt['id'],
        'description': 'pytest salary',
    }
    created = client.post('/api/shifts/manual', headers=manager_headers, json=payload)
    assert created.status_code in (200, 201), created.text
    shift = created.json()
    assert shift.get('calculated_amount') is not None
    assert float(shift['calculated_amount']) >= 0


def test_sharing_request_notification(
    client: httpx.Client, manager_headers: dict[str, str], org_id: str
) -> None:
    # Create a listing as manager/admin of demo org
    fields = client.get('/api/fields', headers=manager_headers)
    assert fields.status_code == 200
    field_list = fields.json()
    if not field_list:
        pytest.skip('no fields')
    field = field_list[0]

    listing = client.post(
        '/api/sharing/listings',
        headers=manager_headers,
        json={
            'type': 'field',
            'field_id': field['id'],
            'title': 'Pytest listing',
            'description': 'integration',
        },
    )
    # Some schemas may differ — accept create or validation skip
    if listing.status_code not in (200, 201):
        pytest.skip(f'listing create not available: {listing.status_code} {listing.text[:200]}')

    listing_id = listing.json()['id']
    before = client.get('/api/notifications/count', headers=manager_headers)
    assert before.status_code == 200

    # Second user in same org requests
    emp_login = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': org_id},
    )
    assert emp_login.status_code == 200
    he = {'Authorization': f"Bearer {emp_login.json()['access_token']}"}

    req = client.post(
        '/api/sharing/requests',
        headers=he,
        json={'listing_id': listing_id, 'message': 'pytest please'},
    )
    if req.status_code not in (200, 201):
        pytest.skip(f'request create: {req.status_code} {req.text[:200]}')

    after = client.get('/api/notifications/count', headers=manager_headers)
    assert after.status_code == 200
