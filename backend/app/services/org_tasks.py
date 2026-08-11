"""Service layer for organizational tasks — isolated from agro/shift/payroll."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.employee import Employee
from app.models.org_task import OrgTask
from app.schemas.org_task import TaskCreate, TaskUpdate
from app.services.action_permissions import employee_has_action

VISIBILITY_ALL = 'all_employees'
VISIBILITY_SPECIFIC = 'specific_employee'
STATUS_ACTIVE = 'active'
STATUS_COMPLETED = 'completed'
STATUS_CANCELLED = 'cancelled'


def _load_options():
    return (
        selectinload(OrgTask.assignee),
        selectinload(OrgTask.creator),
        selectinload(OrgTask.completer),
        selectinload(OrgTask.canceller),
    )


def task_to_dict(task: OrgTask) -> dict[str, Any]:
    return {
        'id': task.id,
        'org_id': task.org_id,
        'title': task.title,
        'description': task.description,
        'visibility_type': task.visibility_type,
        'assignee_id': task.assignee_id,
        'assignee_name': task.assignee.full_name if task.assignee else None,
        'status': task.status,
        'created_by': task.created_by,
        'created_by_name': task.creator.full_name if task.creator else None,
        'created_at': task.created_at,
        'completed_by': task.completed_by,
        'completed_by_name': task.completer.full_name if task.completer else None,
        'completed_at': task.completed_at,
        'cancelled_by': task.cancelled_by,
        'cancelled_by_name': task.canceller.full_name if task.canceller else None,
        'cancelled_at': task.cancelled_at,
        'cancellation_reason': task.cancellation_reason,
    }


def can_view_all(effective: dict[str, Any]) -> bool:
    return employee_has_action(effective, 'tasks.view_all')


def can_manage(effective: dict[str, Any]) -> bool:
    return employee_has_action(effective, 'tasks.manage')


def can_create(effective: dict[str, Any]) -> bool:
    return employee_has_action(effective, 'tasks.create')


def can_complete(task: OrgTask, employee: Employee, effective: dict[str, Any]) -> bool:
    if can_manage(effective):
        return True
    if task.visibility_type == VISIBILITY_SPECIFIC and task.assignee_id == employee.id:
        return employee_has_action(effective, 'tasks.complete_own')
    if task.visibility_type == VISIBILITY_ALL:
        return employee_has_action(effective, 'tasks.complete_general')
    return False


def apply_visibility_filter(query, employee: Employee, effective: dict[str, Any]):
    """Restrict rows for employees without tasks.view_all."""
    if can_view_all(effective):
        return query
    return query.where(
        or_(
            OrgTask.visibility_type == VISIBILITY_ALL,
            OrgTask.assignee_id == employee.id,
        )
    )


async def get_task_or_404(db: AsyncSession, task_id: UUID, org_id: UUID) -> OrgTask:
    result = await db.execute(
        select(OrgTask)
        .options(*_load_options())
        .where(OrgTask.id == task_id, OrgTask.org_id == org_id)
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Задача не найдена')
    return task


async def assert_assignee_in_org(db: AsyncSession, org_id: UUID, assignee_id: UUID) -> Employee:
    result = await db.execute(
        select(Employee).where(
            Employee.id == assignee_id,
            Employee.org_id == org_id,
            Employee.is_active.is_(True),
        )
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Сотрудник не найден или неактивен',
        )
    return row


async def list_tasks(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    status_filter: str = 'active',
    scope: str = 'all',
    assignee_id: UUID | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[OrgTask]:
    query = select(OrgTask).options(*_load_options()).where(OrgTask.org_id == org_id)
    query = apply_visibility_filter(query, employee, effective)

    if status_filter and status_filter != 'all':
        if status_filter not in (STATUS_ACTIVE, STATUS_COMPLETED, STATUS_CANCELLED):
            raise HTTPException(status_code=400, detail='Некорректный статус')
        query = query.where(OrgTask.status == status_filter)

    if scope == 'my':
        query = query.where(
            OrgTask.visibility_type == VISIBILITY_SPECIFIC,
            OrgTask.assignee_id == employee.id,
        )
    elif scope == 'general':
        query = query.where(OrgTask.visibility_type == VISIBILITY_ALL)
    elif scope != 'all':
        raise HTTPException(status_code=400, detail='Некорректный scope')

    if assignee_id is not None:
        if not can_view_all(effective):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Недостаточно прав для фильтра по сотруднику',
            )
        query = query.where(OrgTask.assignee_id == assignee_id)

    query = (
        query.order_by(OrgTask.created_at.desc())
        .limit(min(max(limit, 1), 200))
        .offset(max(offset, 0))
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def create_task(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    payload: TaskCreate,
) -> OrgTask:
    if not can_create(effective):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    assignee_id = payload.assignee_id
    if payload.visibility_type == VISIBILITY_SPECIFIC:
        assert assignee_id is not None
        await assert_assignee_in_org(db, org_id, assignee_id)
    else:
        assignee_id = None

    task = OrgTask(
        org_id=org_id,
        title=payload.title,
        description=payload.description,
        visibility_type=payload.visibility_type,
        assignee_id=assignee_id,
        status=STATUS_ACTIVE,
        created_by=employee.id,
    )
    db.add(task)
    await db.commit()
    return await get_task_or_404(db, task.id, org_id)


async def update_task(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    task_id: UUID,
    payload: TaskUpdate,
) -> OrgTask:
    if not can_manage(effective):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    task = await get_task_or_404(db, task_id, org_id)
    if task.status != STATUS_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Редактировать можно только активную задачу',
        )

    data = payload.model_dump(exclude_unset=True)
    next_visibility = data.get('visibility_type', task.visibility_type)
    next_assignee = data.get('assignee_id', task.assignee_id) if 'assignee_id' in data else task.assignee_id

    if 'visibility_type' in data:
        if next_visibility == VISIBILITY_ALL:
            next_assignee = None
        elif next_assignee is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите сотрудника для персональной задачи',
            )

    if next_visibility == VISIBILITY_SPECIFIC:
        if next_assignee is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Укажите сотрудника для персональной задачи',
            )
        await assert_assignee_in_org(db, org_id, next_assignee)
    else:
        next_assignee = None

    if 'title' in data and data['title'] is not None:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    task.visibility_type = next_visibility
    task.assignee_id = next_assignee

    await db.commit()
    return await get_task_or_404(db, task.id, org_id)


async def complete_task(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    task_id: UUID,
) -> OrgTask:
    task = await get_task_or_404(db, task_id, org_id)

    if not can_view_all(effective):
        if task.visibility_type == VISIBILITY_SPECIFIC and task.assignee_id != employee.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Задача не найдена')

    if task.status == STATUS_COMPLETED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Задача уже выполнена')
    if task.status != STATUS_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Выполнить можно только активную задачу',
        )
    if not can_complete(task, employee, effective):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    task.status = STATUS_COMPLETED
    task.completed_by = employee.id
    task.completed_at = datetime.now(timezone.utc)
    await db.commit()
    return await get_task_or_404(db, task.id, org_id)


async def reopen_task(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    task_id: UUID,
) -> OrgTask:
    if not can_manage(effective):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    task = await get_task_or_404(db, task_id, org_id)
    if task.status != STATUS_COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Открыть снова можно только выполненную задачу',
        )

    task.status = STATUS_ACTIVE
    task.completed_by = None
    task.completed_at = None
    await db.commit()
    return await get_task_or_404(db, task.id, org_id)


async def cancel_task(
    db: AsyncSession,
    *,
    org_id: UUID,
    employee: Employee,
    effective: dict[str, Any],
    task_id: UUID,
    reason: str,
) -> OrgTask:
    if not can_manage(effective):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Недостаточно прав')

    task = await get_task_or_404(db, task_id, org_id)
    if task.status != STATUS_ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Отменить можно только активную задачу',
        )

    task.status = STATUS_CANCELLED
    task.cancelled_by = employee.id
    task.cancelled_at = datetime.now(timezone.utc)
    task.cancellation_reason = reason
    await db.commit()
    return await get_task_or_404(db, task.id, org_id)
