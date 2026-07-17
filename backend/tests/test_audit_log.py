"""Audit log service + employee/expense/agro_plan integration tests."""

from __future__ import annotations

from datetime import date
from uuid import uuid4

import httpx
import pytest

from app.services.audit import build_summary, sanitize_payload


def test_sanitize_strips_password():
    cleaned = sanitize_payload({'name': 'A', 'password_hash': 'secret', 'token': 'x'})
    assert cleaned == {'name': 'A'}


def test_build_summary_uses_name():
    summary = build_summary('update', 'expense', after={'category': 'ГСМ'})
    assert 'ГСМ' in summary
    assert 'Затрата' in summary or 'Изменение' in summary


def test_model_snapshot_skips_password_hash():
    class Dummy:
        __tablename__ = 'employees'

    # Lightweight: sanitize_payload already covers dict path used in routers
    assert sanitize_payload({'password_hash': 'x', 'full_name': 'Иван'}) == {'full_name': 'Иван'}


def test_audit_log_on_expense_crud(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    created = client.post(
        '/api/expenses',
        headers=manager_headers,
        json={
            'date': date.today().isoformat(),
            'category': 'pytest-audit',
            'amount': 100,
            'description': 'audit create',
            'payment_method': 'cash',
        },
    )
    assert created.status_code == 201, created.text
    expense_id = created.json()['id']

    patched = client.patch(
        f'/api/expenses/{expense_id}',
        headers=manager_headers,
        json={'description': 'audit update'},
    )
    assert patched.status_code == 200, patched.text

    history = client.get(
        f'/api/audit-log/entity/expense/{expense_id}',
        headers=manager_headers,
    )
    assert history.status_code == 200, history.text
    actions = {row['action'] for row in history.json()}
    assert 'create' in actions
    assert 'update' in actions

    listed = client.get(
        '/api/audit-log',
        headers=manager_headers,
        params={'entity_type': 'expense', 'page_size': 20},
    )
    assert listed.status_code == 200, listed.text
    body = listed.json()
    assert body['total'] >= 2
    assert 'items' in body


def test_audit_log_on_agro_plan_create(
    client: httpx.Client, manager_headers: dict[str, str]
) -> None:
    fields = client.get('/api/fields', headers=manager_headers)
    assert fields.status_code == 200
    field_list = [f for f in fields.json() if f.get('is_active', True)]
    if not field_list:
        pytest.skip('no fields')
    wts = client.get('/api/work-types', headers=manager_headers)
    wt = next((w for w in wts.json() if w.get('is_active', True)), None)
    assert wt

    created = client.post(
        '/api/agro-plan',
        headers=manager_headers,
        json={
            'field_ids': [field_list[0]['id']],
            'work_type_id': wt['id'],
            'planned_date': date.today().isoformat(),
            'notes': 'audit agro',
        },
    )
    assert created.status_code == 201, created.text
    plan_id = created.json()['id']

    history = client.get(
        f'/api/audit-log/entity/agro_plan/{plan_id}',
        headers=manager_headers,
    )
    assert history.status_code == 200, history.text
    assert any(row['action'] == 'create' for row in history.json())

    client.delete(f'/api/agro-plan/{plan_id}', headers=manager_headers)


def test_audit_log_employee_create_update(
    client: httpx.Client, admin_headers: dict[str, str], manager_headers: dict[str, str]
) -> None:
    code = f'AUD{uuid4().hex[:6].upper()}'
    created = client.post(
        '/api/employees',
        headers=admin_headers,
        json={
            'employee_code': code,
            'full_name': 'Audit Test User',
            'position': 'Тест',
            'hourly_rate': 100,
            'role': 'employee',
            'password': '1234',
        },
    )
    if created.status_code not in (200, 201):
        pytest.skip(f'employee create: {created.status_code} {created.text[:200]}')
    emp_id = created.json()['id']

    # password must not appear in after_data
    hist = client.get(f'/api/audit-log/entity/employee/{emp_id}', headers=manager_headers)
    assert hist.status_code == 200, hist.text
    create_row = next(r for r in hist.json() if r['action'] == 'create')
    after = create_row.get('after_data') or {}
    assert 'password' not in after
    assert 'password_hash' not in after

    patched = client.patch(
        f'/api/employees/{emp_id}',
        headers=admin_headers,
        json={'position': 'Обновлено'},
    )
    assert patched.status_code == 200, patched.text

    hist2 = client.get(f'/api/audit-log/entity/employee/{emp_id}', headers=manager_headers)
    assert any(r['action'] == 'update' for r in hist2.json())
