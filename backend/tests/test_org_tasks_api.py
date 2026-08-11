"""Live API tests for organizational tasks (requires running API + seed)."""

from __future__ import annotations

from uuid import uuid4

import httpx
import pytest


@pytest.fixture(scope='module')
def employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


@pytest.fixture(scope='module')
def other_employee_headers(client: httpx.Client, demo_org_id: str) -> dict[str, str]:
    r = client.post(
        '/api/auth/login',
        json={'email': 'EMP002', 'password': '1234', 'org_id': demo_org_id},
    )
    assert r.status_code == 200, r.text
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def _me(client: httpx.Client, headers: dict[str, str]) -> dict:
    r = client.get('/api/auth/me', headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _create_general(client: httpx.Client, headers: dict[str, str], title: str) -> dict:
    r = client.post(
        '/api/tasks',
        headers=headers,
        json={
            'title': title,
            'description': 'Проверка раздела задач',
            'visibility_type': 'all_employees',
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_admin_creates_general_and_personal(
    client: httpx.Client,
    admin_headers: dict[str, str],
    employee_headers: dict[str, str],
) -> None:
    emp = _me(client, employee_headers)
    general = _create_general(
        client, admin_headers, f'Проверить остатки масла {uuid4().hex[:6]}'
    )
    assert general['status'] == 'active'
    assert general['visibility_type'] == 'all_employees'
    assert general['assignee_id'] is None

    personal = client.post(
        '/api/tasks',
        headers=admin_headers,
        json={
            'title': f'Позвонить в сервис {uuid4().hex[:6]}',
            'visibility_type': 'specific_employee',
            'assignee_id': emp['id'],
        },
    )
    assert personal.status_code == 201, personal.text
    body = personal.json()
    assert body['assignee_id'] == emp['id']
    assert body['visibility_type'] == 'specific_employee'


def test_employee_visibility_and_complete_rules(
    client: httpx.Client,
    admin_headers: dict[str, str],
    employee_headers: dict[str, str],
    other_employee_headers: dict[str, str],
) -> None:
    emp = _me(client, employee_headers)
    other = _me(client, other_employee_headers)
    suffix = uuid4().hex[:6]

    general = _create_general(client, admin_headers, f'Убрать территорию {suffix}')
    mine = client.post(
        '/api/tasks',
        headers=admin_headers,
        json={
            'title': f'Забрать запчасть {suffix}',
            'visibility_type': 'specific_employee',
            'assignee_id': emp['id'],
        },
    ).json()
    foreign = client.post(
        '/api/tasks',
        headers=admin_headers,
        json={
            'title': f'Сдать документы {suffix}',
            'visibility_type': 'specific_employee',
            'assignee_id': other['id'],
        },
    ).json()

    listed = client.get('/api/tasks', headers=employee_headers, params={'status': 'active'})
    assert listed.status_code == 200, listed.text
    ids = {row['id'] for row in listed.json()}
    assert general['id'] in ids
    assert mine['id'] in ids
    assert foreign['id'] not in ids

    # Without complete_general — cannot finish general task
    denied = client.post(f"/api/tasks/{general['id']}/complete", headers=employee_headers)
    assert denied.status_code == 403, denied.text

    # complete_own — can finish personal
    done = client.post(f"/api/tasks/{mine['id']}/complete", headers=employee_headers)
    assert done.status_code == 200, done.text
    assert done.json()['status'] == 'completed'
    assert done.json()['completed_by'] == emp['id']

    # Cannot see/complete foreign
    foreign_complete = client.post(
        f"/api/tasks/{foreign['id']}/complete", headers=employee_headers
    )
    assert foreign_complete.status_code in (403, 404)


def test_cancel_requires_reason_and_reopen_needs_manage(
    client: httpx.Client,
    admin_headers: dict[str, str],
    employee_headers: dict[str, str],
) -> None:
    task = _create_general(client, admin_headers, f'Проверить документы {uuid4().hex[:6]}')

    bad = client.post(
        f"/api/tasks/{task['id']}/cancel",
        headers=admin_headers,
        json={'cancellation_reason': 'нет'},
    )
    assert bad.status_code == 422, bad.text

    cancelled = client.post(
        f"/api/tasks/{task['id']}/cancel",
        headers=admin_headers,
        json={'cancellation_reason': 'Больше не актуально'},
    )
    assert cancelled.status_code == 200, cancelled.text
    body = cancelled.json()
    assert body['status'] == 'cancelled'
    assert body['cancellation_reason'] == 'Больше не актуально'
    assert body['cancelled_by']
    assert body['cancelled_at']

    other = _create_general(client, admin_headers, f'Привезти масло {uuid4().hex[:6]}')
    admin_done = client.post(f"/api/tasks/{other['id']}/complete", headers=admin_headers)
    assert admin_done.status_code == 200, admin_done.text

    denied_reopen = client.post(
        f"/api/tasks/{other['id']}/reopen", headers=employee_headers
    )
    assert denied_reopen.status_code == 403, denied_reopen.text

    reopened = client.post(f"/api/tasks/{other['id']}/reopen", headers=admin_headers)
    assert reopened.status_code == 200, reopened.text
    assert reopened.json()['status'] == 'active'
    assert reopened.json()['completed_by'] is None
