"""Repair role_permissions wiped by 077_grant_tasks_section.

Revision ID: 078_repair_tasks_section_grants
Revises: 077_grant_tasks_section

077 replaced missing role keys with ``['tasks']`` instead of defaults+tasks,
so managers lost dashboard/worktime/inventory/etc. Restore defaults when the
stored list lacks core manager markers (or employee list is tasks-only).
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = '078_repair_tasks_section_grants'
down_revision: Union[str, None] = '077_grant_tasks_section'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Keep in sync with app.services.permissions SECTION_KEYS / defaults.
DEFAULT_MANAGER_SECTIONS: list[str] = [
    'my-shift',
    'dashboard',
    'worktime',
    'agro-calendar',
    'tasks',
    'sharing',
    'fields',
    'equipment',
    'implements',
    'maintenance',
    'purchase-planner',
    'inventory',
    'shipments',
    'expenses',
    'analytics',
    'reports',
    'employees',
    'audit-log',
    'settings',
]
DEFAULT_EMPLOYEE_SECTIONS: list[str] = ['my-shift', 'sharing', 'tasks']
_MANAGER_MARKERS = frozenset({'dashboard', 'worktime', 'my-shift'})


def _as_settings(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        return dict(raw)
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return dict(parsed) if isinstance(parsed, dict) else {}
    return {}


def _with_tasks(sections: list[str]) -> list[str]:
    cleaned = [s for s in sections if isinstance(s, str)]
    if 'tasks' not in cleaned:
        cleaned.append('tasks')
    return cleaned


def _repair_manager(sections: Any) -> list[str]:
    if not isinstance(sections, list):
        return list(DEFAULT_MANAGER_SECTIONS)
    cleaned = [s for s in sections if isinstance(s, str)]
    # Empty list is an intentional admin revoke — leave it.
    if not cleaned:
        return cleaned
    if not _MANAGER_MARKERS.issubset(set(cleaned)):
        return list(DEFAULT_MANAGER_SECTIONS)
    return _with_tasks(cleaned)


def _repair_employee(sections: Any) -> list[str]:
    if not isinstance(sections, list):
        return list(DEFAULT_EMPLOYEE_SECTIONS)
    cleaned = [s for s in sections if isinstance(s, str)]
    # 077 damage pattern: only tasks (defaults never applied).
    if cleaned == ['tasks'] or set(cleaned) == {'tasks'}:
        return list(DEFAULT_EMPLOYEE_SECTIONS)
    if not cleaned:
        return cleaned
    return _with_tasks(cleaned)


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(text('SELECT id, settings FROM organizations')).mappings().all()
    for row in rows:
        settings = _as_settings(row['settings'])
        perms = settings.get('role_permissions')
        if not isinstance(perms, dict):
            perms = {}
        repaired = {
            **perms,
            'manager': _repair_manager(perms.get('manager')),
            'employee': _repair_employee(perms.get('employee')),
        }
        settings = {**settings, 'role_permissions': repaired}
        conn.execute(
            text('UPDATE organizations SET settings = CAST(:settings AS jsonb) WHERE id = :id'),
            {'id': str(row['id']), 'settings': json.dumps(settings)},
        )


def downgrade() -> None:
    # Irreversible data repair.
    pass
