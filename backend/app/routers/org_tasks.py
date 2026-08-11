"""Organizational tasks API — not agro calendar / shifts / payroll."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.schemas.org_task import TaskCancelBody, TaskCreate, TaskResponse, TaskUpdate
from app.services.action_permissions import resolve_effective_permissions
from app.services.org_tasks import (
    cancel_task,
    complete_task,
    create_task,
    list_tasks,
    reopen_task,
    task_to_dict,
    update_task,
)
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('tasks'))])


def _response(task) -> TaskResponse:
    return TaskResponse.model_validate(task_to_dict(task))


@router.get('', response_model=list[TaskResponse])
async def get_tasks(
    request: Request,
    status: str = Query('active'),
    scope: str = Query('all'),
    assignee_id: UUID | None = Query(None),
    limit: int = Query(100, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> list[TaskResponse]:
    effective = await resolve_effective_permissions(db, current)
    rows = await list_tasks(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        status_filter=status,
        scope=scope,
        assignee_id=assignee_id,
        limit=limit,
        offset=offset,
    )
    return [_response(row) for row in rows]


@router.post('', response_model=TaskResponse, status_code=201)
async def post_task(
    request: Request,
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> TaskResponse:
    effective = await resolve_effective_permissions(db, current)
    task = await create_task(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        payload=payload,
    )
    return _response(task)


@router.patch('/{task_id}', response_model=TaskResponse)
async def patch_task(
    request: Request,
    task_id: UUID,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> TaskResponse:
    effective = await resolve_effective_permissions(db, current)
    task = await update_task(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        task_id=task_id,
        payload=payload,
    )
    return _response(task)


@router.post('/{task_id}/complete', response_model=TaskResponse)
async def post_complete(
    request: Request,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> TaskResponse:
    effective = await resolve_effective_permissions(db, current)
    task = await complete_task(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        task_id=task_id,
    )
    return _response(task)


@router.post('/{task_id}/reopen', response_model=TaskResponse)
async def post_reopen(
    request: Request,
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> TaskResponse:
    effective = await resolve_effective_permissions(db, current)
    task = await reopen_task(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        task_id=task_id,
    )
    return _response(task)


@router.post('/{task_id}/cancel', response_model=TaskResponse)
async def post_cancel(
    request: Request,
    task_id: UUID,
    payload: TaskCancelBody,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(get_current_employee),
) -> TaskResponse:
    effective = await resolve_effective_permissions(db, current)
    task = await cancel_task(
        db,
        org_id=get_org_id(request),
        employee=current,
        effective=effective,
        task_id=task_id,
        reason=payload.cancellation_reason,
    )
    return _response(task)
