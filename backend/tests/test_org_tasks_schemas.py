"""Schema validation for org tasks."""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.org_task import TaskCancelBody, TaskCreate


def test_task_create_requires_assignee_for_personal() -> None:
    with pytest.raises(ValidationError):
        TaskCreate(title='Позвонить в сервис', visibility_type='specific_employee')


def test_task_create_clears_assignee_for_all() -> None:
    from uuid import uuid4

    row = TaskCreate(
        title='Убрать территорию у склада',
        visibility_type='all_employees',
        assignee_id=uuid4(),
    )
    assert row.assignee_id is None


def test_cancel_reason_min_length() -> None:
    with pytest.raises(ValidationError):
        TaskCancelBody(cancellation_reason='нет')
    ok = TaskCancelBody(cancellation_reason='Больше не актуально')
    assert ok.cancellation_reason.startswith('Больше')
