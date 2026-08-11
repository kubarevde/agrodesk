"""payroll_visible_to_employees org setting (Prompt #7)."""

from __future__ import annotations

from datetime import date

import httpx

from app.services.org_features import (
    PAYROLL_VISIBLE_TO_EMPLOYEES_KEY,
    payroll_visible_to_employees,
)


def test_payroll_visible_default_true() -> None:
    assert payroll_visible_to_employees({}) is True
    assert payroll_visible_to_employees({PAYROLL_VISIBLE_TO_EMPLOYEES_KEY: True}) is True
    assert payroll_visible_to_employees({PAYROLL_VISIBLE_TO_EMPLOYEES_KEY: False}) is False


def test_payroll_visible_writable_on_org_update_schema() -> None:
    from app.routers.settings import OrgSettingsResponse, OrgSettingsUpdate

    assert 'payroll_visible_to_employees' in OrgSettingsResponse.model_fields
    assert 'payroll_visible_to_employees' in OrgSettingsUpdate.model_fields
    updated = OrgSettingsUpdate.model_validate(
        {'payroll_visible_to_employees': False, 'timezone': 'UTC'}
    )
    assert updated.model_dump(exclude_unset=True) == {
        'timezone': 'UTC',
        'payroll_visible_to_employees': False,
    }


def test_org_settings_patch_persists_payroll_visibility(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    before = client.get('/api/settings/organization', headers=admin_headers)
    assert before.status_code == 200, before.text
    assert before.json()['payroll_visible_to_employees'] is True

    off = client.patch(
        '/api/settings/organization',
        headers=admin_headers,
        json={'payroll_visible_to_employees': False},
    )
    assert off.status_code == 200, off.text
    assert off.json()['payroll_visible_to_employees'] is False

    again = client.get('/api/settings/organization', headers=admin_headers)
    assert again.status_code == 200, again.text
    assert again.json()['payroll_visible_to_employees'] is False

    # Restore default for other tests.
    restored = client.patch(
        '/api/settings/organization',
        headers=admin_headers,
        json={'payroll_visible_to_employees': True},
    )
    assert restored.status_code == 200, restored.text
    assert restored.json()['payroll_visible_to_employees'] is True


def test_employee_earnings_hidden_when_org_disables(
    client: httpx.Client,
    admin_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    month = date.today().strftime('%Y-%m')
    try:
        off = client.patch(
            '/api/settings/organization',
            headers=admin_headers,
            json={'payroll_visible_to_employees': False},
        )
        assert off.status_code == 200, off.text

        emp_login = client.post(
            '/api/auth/login',
            json={'email': 'EMP002', 'password': '1234', 'org_id': demo_org_id},
        )
        assert emp_login.status_code == 200, emp_login.text
        emp_headers = {'Authorization': f"Bearer {emp_login.json()['access_token']}"}

        hidden = client.get(
            '/api/employees/me/earnings',
            headers=emp_headers,
            params={'month': month},
        )
        assert hidden.status_code == 200, hidden.text
        body = hidden.json()
        assert body.get('hidden') is True
        assert 'totalAmount' not in body
        assert 'hours' in body
        assert 'shiftsCount' in body
        for row in body.get('shifts', []):
            assert 'amount' not in row
            assert 'hours' in row

        # Manager still sees full money.
        mgr = client.get(
            '/api/employees/me/earnings',
            headers=admin_headers,
            params={'month': month},
        )
        assert mgr.status_code == 200, mgr.text
        full = mgr.json()
        assert full.get('hidden') is not True
        assert 'totalAmount' in full
    finally:
        client.patch(
            '/api/settings/organization',
            headers=admin_headers,
            json={'payroll_visible_to_employees': True},
        )
