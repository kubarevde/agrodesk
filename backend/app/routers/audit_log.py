from datetime import date, datetime, time
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_manager
from app.middleware.org_context import get_org_id
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.schemas.audit_log import AuditLogListResponse, AuditLogResponse
from app.services.audit import entity_type_label
from app.services.permissions import require_manager_section

router = APIRouter(dependencies=[Depends(require_manager_section('audit-log'))])


def _to_response(row: AuditLog) -> AuditLogResponse:
    actor_name = None
    if row.actor is not None:
        actor_name = row.actor.full_name or row.actor.employee_code
    return AuditLogResponse(
        id=row.id,
        entity_type=row.entity_type,
        entity_type_label=entity_type_label(row.entity_type),
        entity_id=row.entity_id,
        action=row.action,
        changed_by=row.changed_by,
        changed_by_name=actor_name,
        changed_at=row.changed_at,
        before_data=row.before_data,
        after_data=row.after_data,
        summary=row.summary,
    )


def _base_query(org_id: UUID):
    return (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .where(AuditLog.org_id == org_id)
    )


@router.get('', response_model=AuditLogListResponse)
async def list_audit_log(
    request: Request,
    entity_type: str | None = Query(None),
    entity_id: UUID | None = Query(None),
    employee_id: UUID | None = Query(None, description='Filter by changed_by'),
    action: str | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> AuditLogListResponse:
    org_id = get_org_id(request)
    filters = [AuditLog.org_id == org_id]
    if entity_type:
        filters.append(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        filters.append(AuditLog.entity_id == entity_id)
    if employee_id is not None:
        filters.append(AuditLog.changed_by == employee_id)
    if action:
        filters.append(AuditLog.action == action)
    if from_date is not None:
        filters.append(AuditLog.changed_at >= datetime.combine(from_date, time.min))
    if to_date is not None:
        filters.append(AuditLog.changed_at <= datetime.combine(to_date, time.max))

    total = (
        await db.execute(select(func.count()).select_from(AuditLog).where(*filters))
    ).scalar_one()

    query = (
        select(AuditLog)
        .options(selectinload(AuditLog.actor))
        .where(*filters)
        .order_by(AuditLog.changed_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    rows = (await db.execute(query)).scalars().all()
    return AuditLogListResponse(
        items=[_to_response(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get('/entity/{entity_type}/{entity_id}', response_model=list[AuditLogResponse])
async def list_entity_audit_history(
    request: Request,
    entity_type: str,
    entity_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_manager),
) -> list[AuditLogResponse]:
    org_id = get_org_id(request)
    query = (
        _base_query(org_id)
        .where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        .order_by(AuditLog.changed_at.desc())
        .limit(200)
    )
    rows = (await db.execute(query)).scalars().all()
    return [_to_response(row) for row in rows]
