"""Regression: closing an open shift with shift_hours equipment must succeed."""

from __future__ import annotations

import httpx


def test_close_open_shift_with_equipment_online(
    client: httpx.Client,
    manager_headers: dict[str, str],
    demo_org_id: str,
) -> None:
    locs = client.get('/api/locations', headers=manager_headers).json()
    wts = client.get('/api/work-types', headers=manager_headers).json()
    loc = next(l for l in locs if l.get('is_active'))
    wt = next(w for w in wts if w.get('is_active'))
    eq = client.get('/api/equipment', headers=manager_headers).json()
    shift_hours_eq = next(
        (e for e in eq if e.get('meter_type') == 'shift_hours' and e.get('is_active')),
        None,
    )
    assert shift_hours_eq, 'seed must include shift_hours equipment'

    emp_login = client.post(
        '/api/auth/login',
        json={'email': 'EMP001', 'password': '1234', 'org_id': demo_org_id},
    )
    assert emp_login.status_code == 200, emp_login.text
    he = {'Authorization': f"Bearer {emp_login.json()['access_token']}"}

    # Close leftovers so we can open a fresh shift.
    opens = client.get('/api/shifts', headers=he, params={'status': 'open'}).json()
    for s in opens:
        closed = client.post(
            f"/api/shifts/{s['id']}/close",
            headers=he,
            json={'description': 'pytest cleanup open shift'},
        )
        assert closed.status_code in (200, 400), closed.text

    opened = client.post(
        '/api/shifts',
        headers=he,
        json={
            'location_id': loc['id'],
            'work_type_id': wt['id'],
            'equipment_id': shift_hours_eq['id'],
        },
    )
    assert opened.status_code in (200, 201), opened.text
    sid = opened.json()['id']

    closed = client.post(
        f'/api/shifts/{sid}/close',
        headers=he,
        json={'description': 'pytest close with equipment meter'},
    )
    assert closed.status_code == 200, closed.text
    body = closed.json()
    assert body.get('status') == 'closed'
    assert body.get('end_time') is not None
    assert body.get('calculated_amount') is not None
