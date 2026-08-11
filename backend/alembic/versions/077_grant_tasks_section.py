"""Grant «tasks» section to existing org role_permissions defaults.

Revision ID: 077_grant_tasks_section
Revises: 076_org_tasks
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = '077_grant_tasks_section'
down_revision: Union[str, None] = '076_org_tasks'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Keep in sync with app.services.permissions defaults (also repaired in 078).
_DEFAULT_MANAGER: list[str] = [
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
_DEFAULT_EMPLOYEE: list[str] = ['my-shift', 'sharing', 'tasks']


def _with_tasks(sections: Any, *, default: list[str]) -> list[str]:
    """Append tasks to an existing list; missing key uses role defaults (not [])."""
    if not isinstance(sections, list):
        sections = list(default)
    cleaned = [s for s in sections if isinstance(s, str)]
    if 'tasks' not in cleaned:
        cleaned.append('tasks')
    return cleaned


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(text('SELECT id, settings FROM organizations')).mappings().all()
    for row in rows:
        settings = row['settings'] if isinstance(row['settings'], dict) else {}
        if isinstance(settings, str):
            try:
                settings = json.loads(settings)
            except json.JSONDecodeError:
                settings = {}
        if not isinstance(settings, dict):
            settings = {}
        perms = settings.get('role_permissions')
        if not isinstance(perms, dict):
            perms = {}
        perms = {
            **perms,
            'employee': _with_tasks(perms.get('employee'), default=_DEFAULT_EMPLOYEE),
            'manager': _with_tasks(perms.get('manager'), default=_DEFAULT_MANAGER),
        }
        settings = {**settings, 'role_permissions': perms}
        conn.execute(
            text('UPDATE organizations SET settings = CAST(:settings AS jsonb) WHERE id = :id'),
            {'id': str(row['id']), 'settings': json.dumps(settings)},
        )


def downgrade() -> None:
    # Keep section grants — removing could lock employees out unexpectedly.
    pass
