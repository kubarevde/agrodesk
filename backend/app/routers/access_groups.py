"""CRUD for access groups (Settings → Доступы → Группы)."""

from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies.auth import require_admin
from app.middleware.org_context import get_org_id
from app.models.access_group import AccessGroup
from app.models.employee import Employee
from app.schemas.permissions import (
    AccessGroupCatalogResponse,
    AccessGroupCreate,
    AccessGroupMember,
    AccessGroupResponse,
    AccessGroupUpdate,
    ActionInfo,
    SectionInfo,
)
from app.services.action_permissions import (
    ACTION_KEYS,
    ACTION_LABELS,
    ensure_system_access_groups,
    normalize_actions,
    normalize_group_sections,
)
from app.services.audit import log_change, model_snapshot
from app.services.permissions import SECTION_KEYS, SECTION_LABELS

router = APIRouter()


def _group_to_response(group: AccessGroup, members: list[Employee] | None = None) -> AccessGroupResponse:
    member_list = members if members is not None else list(group.members or [])
    return AccessGroupResponse(
        id=group.id,
        name=group.name,
        code=group.code,
        is_system=bool(group.is_system),
        sections=list(group.sections or []),
        actions=list(group.actions or []),
        member_count=len(member_list),
        members=[
            AccessGroupMember(
                id=m.id,
                full_name=m.full_name,
                employee_code=m.employee_code,
                role=m.role.value if hasattr(m.role, 'value') else str(m.role),
            )
            for m in member_list
        ],
    )


async def _get_group(
    db: AsyncSession, org_id: UUID, group_id: UUID
) -> AccessGroup:
    result = await db.execute(
        select(AccessGroup)
        .options(selectinload(AccessGroup.members))
        .where(AccessGroup.id == group_id, AccessGroup.org_id == org_id)
    )
    group = result.scalar_one_or_none()
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Группа не найдена')
    return group


async def _assign_members(
    db: AsyncSession,
    org_id: UUID,
    group: AccessGroup,
    member_ids: list[UUID],
) -> None:
    # Clear current members of this group first
    current = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.access_group_id == group.id,
        )
    )
    for emp in current.scalars().all():
        emp.access_group_id = None
        db.add(emp)

    if not member_ids:
        return

    result = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.id.in_(member_ids),
            Employee.is_active.is_(True),
        )
    )
    found = {e.id: e for e in result.scalars().all()}
    missing = [str(i) for i in member_ids if i not in found]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f'Сотрудники не найдены: {", ".join(missing)}',
        )
    for emp in found.values():
        emp.access_group_id = group.id
        db.add(emp)


@router.get('/access-groups', response_model=AccessGroupCatalogResponse)
async def list_access_groups(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> AccessGroupCatalogResponse:
    org_id = get_org_id(request)
    await ensure_system_access_groups(db, org_id)
    await db.commit()

    result = await db.execute(
        select(AccessGroup)
        .options(selectinload(AccessGroup.members))
        .where(AccessGroup.org_id == org_id)
        .order_by(AccessGroup.is_system.desc(), AccessGroup.name)
    )
    groups = result.scalars().all()
    return AccessGroupCatalogResponse(
        sections=[SectionInfo(key=k, label=SECTION_LABELS[k]) for k in SECTION_KEYS],
        actions=[ActionInfo(key=k, label=ACTION_LABELS[k]) for k in ACTION_KEYS],
        groups=[_group_to_response(g) for g in groups],
    )


@router.post(
    '/access-groups',
    response_model=AccessGroupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_access_group(
    request: Request,
    payload: AccessGroupCreate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> AccessGroupResponse:
    org_id = get_org_id(request)
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Укажите название')

    group = AccessGroup(
        id=uuid4(),
        org_id=org_id,
        name=name,
        code=None,
        is_system=False,
        sections=normalize_group_sections(payload.sections),
        actions=normalize_actions(payload.actions),
    )
    db.add(group)
    await db.flush()
    await _assign_members(db, org_id, group, payload.member_ids)
    await log_change(
        db,
        org_id=org_id,
        entity_type='access_group',
        entity_id=group.id,
        action='create',
        changed_by=current.id,
        after=model_snapshot(group),
        summary=f'Создана группа доступа «{group.name}»',
    )
    await db.commit()
    return _group_to_response(await _get_group(db, org_id, group.id))


@router.patch('/access-groups/{group_id}', response_model=AccessGroupResponse)
async def update_access_group(
    request: Request,
    group_id: UUID,
    payload: AccessGroupUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> AccessGroupResponse:
    org_id = get_org_id(request)
    group = await _get_group(db, org_id, group_id)
    before = model_snapshot(group)

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail='Укажите название')
        if group.is_system and name != group.name:
            # Allow rename of system groups? Keep name for supplier preset for clarity.
            group.name = name
        else:
            group.name = name

    if payload.sections is not None:
        group.sections = normalize_group_sections(payload.sections)
    if payload.actions is not None:
        group.actions = normalize_actions(payload.actions)
    if payload.member_ids is not None:
        await _assign_members(db, org_id, group, payload.member_ids)

    db.add(group)
    await log_change(
        db,
        org_id=org_id,
        entity_type='access_group',
        entity_id=group.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(group),
        summary=f'Обновлена группа доступа «{group.name}»',
    )
    await db.commit()
    return _group_to_response(await _get_group(db, org_id, group.id))


@router.delete('/access-groups/{group_id}', status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_access_group(
    request: Request,
    group_id: UUID,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> Response:
    org_id = get_org_id(request)
    group = await _get_group(db, org_id, group_id)
    if group.is_system:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Системную группу нельзя удалить. Снимите назначение со сотрудников.',
        )
    before = model_snapshot(group)
    # Members get SET NULL via FK; clear explicitly for audit clarity
    for member in list(group.members or []):
        member.access_group_id = None
        db.add(member)
    await log_change(
        db,
        org_id=org_id,
        entity_type='access_group',
        entity_id=group.id,
        action='delete',
        changed_by=current.id,
        before=before,
        after=None,
        summary=f'Удалена группа доступа «{group.name}»',
    )
    await db.delete(group)
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)