from __future__ import annotations

from datetime import date, timedelta

import httpx


def test_audit_log_date_range_is_inclusive(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    today = date.today()
    yesterday = today - timedelta(days=1)

    created = client.post(
        '/api/expenses',
        headers=manager_headers,
        json={
            'date': today.isoformat(),
            'category': 'pytest-audit-date-range',
            'amount': 123,
            'description': 'audit date range test',
        },
    )
    assert created.status_code in (200, 201), created.text
    expense_id = created.json()['id']

    in_today = client.get(
        '/api/audit-log',
        headers=manager_headers,
        params={
            'entity_type': 'expense',
            'entity_id': expense_id,
            'from_date': today.isoformat(),
            'to_date': today.isoformat(),
            'page_size': 20,
        },
    )
    assert in_today.status_code == 200, in_today.text
    body_today = in_today.json()
    assert body_today['total'] >= 1
    assert any(
        row.get('entity_id') == expense_id and row.get('action') in ('create', 'created', 'update', 'updated')
        for row in body_today.get('items', [])
    )

    only_yesterday = client.get(
        '/api/audit-log',
        headers=manager_headers,
        params={
            'entity_type': 'expense',
            'entity_id': expense_id,
            'from_date': yesterday.isoformat(),
            'to_date': yesterday.isoformat(),
            'page_size': 20,
        },
    )
    assert only_yesterday.status_code == 200, only_yesterday.text
    body_yesterday = only_yesterday.json()
    assert body_yesterday['total'] == 0

