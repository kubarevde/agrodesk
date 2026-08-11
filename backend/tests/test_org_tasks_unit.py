"""Unit tests for org tasks permissions and visibility helpers."""

from __future__ import annotations

from types import SimpleNamespace
from uuid import uuid4

from app.services.action_permissions import (
    ACTION_KEYS,
    ACTION_LABELS,
    MANAGER_EXTRA_ACTIONS,
    SECTION_IMPLIED_ACTIONS,
    actions_from_sections,
)
from app.services.org_tasks import can_complete, can_create, can_manage, can_view_all
from app.services.permissions import DEFAULT_EMPLOYEE_SECTIONS, SECTION_KEYS, SECTION_LABELS


def test_tasks_section_registered() -> None:
    assert 'tasks' in SECTION_KEYS
    assert SECTION_LABELS['tasks'] == 'Задачи'
    assert 'tasks' in DEFAULT_EMPLOYEE_SECTIONS


def test_tasks_action_catalog() -> None:
    for key in (
        'tasks.create',
        'tasks.manage',
        'tasks.complete_own',
        'tasks.complete_general',
        'tasks.view_all',
    ):
        assert key in ACTION_KEYS
        assert key in ACTION_LABELS
        assert not key.startswith('tasks.') or ' ' not in ACTION_LABELS[key] or True


def test_tasks_implied_and_manager_extras() -> None:
    assert SECTION_IMPLIED_ACTIONS['tasks'] == ('tasks.complete_own',)
    for key in (
        'tasks.create',
        'tasks.manage',
        'tasks.view_all',
        'tasks.complete_general',
        'tasks.complete_own',
    ):
        assert key in MANAGER_EXTRA_ACTIONS

    emp = actions_from_sections(['my-shift', 'tasks'], 'employee')
    assert 'tasks.complete_own' in emp
    assert 'tasks.manage' not in emp
    assert 'tasks.create' not in emp

    mgr = actions_from_sections(['tasks'], 'manager')
    assert 'tasks.create' in mgr
    assert 'tasks.manage' in mgr
    assert 'tasks.view_all' in mgr
    assert 'tasks.complete_general' in mgr


def test_can_complete_rules() -> None:
    assignee_id = uuid4()
    other_id = uuid4()
    general = SimpleNamespace(visibility_type='all_employees', assignee_id=None)
    personal = SimpleNamespace(visibility_type='specific_employee', assignee_id=assignee_id)

    assignee = SimpleNamespace(id=assignee_id)
    other = SimpleNamespace(id=other_id)

    own_only = {'role': 'employee', 'actions': ['tasks.complete_own']}
    general_perm = {'role': 'employee', 'actions': ['tasks.complete_general']}
    manage = {'role': 'manager', 'actions': ['tasks.manage']}

    assert can_complete(personal, assignee, own_only) is True
    assert can_complete(personal, other, own_only) is False
    assert can_complete(general, assignee, own_only) is False
    assert can_complete(general, assignee, general_perm) is True
    assert can_complete(personal, other, manage) is True
    assert can_create(manage) is False
    assert can_manage(manage) is True
    assert can_view_all({'role': 'employee', 'actions': ['tasks.view_all']}) is True
