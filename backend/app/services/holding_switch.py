"""Controlled holding switch: head → child JWT via shadow employee (no multi-membership).

JWT data scope remains single org_id. acting_* claims are for switch-back / UI / audit only.
"""

from __future__ import annotations

import hashlib
import secrets
from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.employee import Employee, EmployeeRole
from app.models.organization import Organization
from app.schemas.auth import EmployeeMe
from app.schemas.holding import HoldingSwitchResponse
from app.services.audit import log_change
from app.services.auth import ALGORITHM, create_access_token, hash_password
from app.services.holding import require_head_org
from app.services.holding_constants import HOLDING_SHADOW_POSITION
from app.services.org_hierarchy import get_link_by_child

# Re-export for tests / callers.
__all__ = [
    'CLAIM_ACTING_FROM_HEAD_ORG_ID',
    'CLAIM_ACTING_HEAD_EMPLOYEE_ID',
    'HOLDING_SHADOW_POSITION',
    'HOLDING_SHADOW_NAME',
]

# JWT claims — never used by OrgContextMiddleware / get_org_id for data scope.
CLAIM_ACTING_FROM_HEAD_ORG_ID = 'acting_from_head_org_id'
CLAIM_ACTING_HEAD_EMPLOYEE_ID = 'acting_head_employee_id'

HOLDING_SHADOW_NAME = 'Холдинг (системный доступ)'


def shadow_employee_code(head_org_id: UUID, child_org_id: UUID) -> str:
    """Deterministic ≤20-char global-unique code for (head, child) shadow admin."""
    digest = hashlib.sha256(f'{head_org_id}:{child_org_id}'.encode()).hexdigest()
    return f'HOLD-{digest[:6]}-{digest[6:12]}'  # 18 chars


def employee_to_me(employee: Employee) -> EmployeeMe:
    return EmployeeMe(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        position=employee.position,
        role=employee.role.value,
        hourly_rate=float(employee.hourly_rate or 0),
    )


def decode_bearer_payload(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        ) from exc


async def _get_org(db: AsyncSession, org_id: UUID) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Организация не найдена')
    return org


async def ensure_shadow_employee(
    db: AsyncSession,
    *,
    head_org_id: UUID,
    child_org_id: UUID,
) -> Employee:
    code = shadow_employee_code(head_org_id, child_org_id)
    result = await db.execute(select(Employee).where(Employee.employee_code == code))
    existing = result.scalar_one_or_none()
    if existing is not None:
        if existing.org_id != child_org_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Конфликт системной учётки холдинга',
            )
        if not existing.is_active:
            existing.is_active = True
            db.add(existing)
            await db.flush()
        return existing

    shadow = Employee(
        org_id=child_org_id,
        employee_code=code,
        full_name=HOLDING_SHADOW_NAME,
        position=HOLDING_SHADOW_POSITION,
        role=EmployeeRole.admin,
        hourly_rate=0,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        telegram_id=None,
        is_active=True,
    )
    try:
        async with db.begin_nested():
            db.add(shadow)
            await db.flush()
    except IntegrityError:
        result = await db.execute(select(Employee).where(Employee.employee_code == code))
        existing = result.scalar_one_or_none()
        if existing is None or existing.org_id != child_org_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail='Не удалось создать системную учётку холдинга',
            )
        return existing
    return shadow


async def switch_to_child(
    db: AsyncSession,
    *,
    head_employee: Employee,
    head_org_id: UUID,
    child_org_id: UUID,
    token_payload: dict,
) -> HoldingSwitchResponse:
    if token_payload.get(CLAIM_ACTING_FROM_HEAD_ORG_ID):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Уже открыт контекст КФХ — сначала вернитесь в головную организацию',
        )

    await require_head_org(db, head_org_id)

    link = await get_link_by_child(db, child_org_id)
    if link is None or link.head_org_id != head_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Организация не является дочерней для текущей головной',
        )

    child = await _get_org(db, child_org_id)
    if not child.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Дочерняя организация неактивна',
        )

    head = await _get_org(db, head_org_id)
    shadow = await ensure_shadow_employee(
        db, head_org_id=head_org_id, child_org_id=child_org_id
    )

    access_token = create_access_token(
        {
            'sub': str(shadow.id),
            'org_id': str(child_org_id),
            CLAIM_ACTING_FROM_HEAD_ORG_ID: str(head_org_id),
            CLAIM_ACTING_HEAD_EMPLOYEE_ID: str(head_employee.id),
        }
    )

    await log_change(
        db,
        org_id=head_org_id,
        entity_type='holding_session',
        entity_id=child_org_id,
        action='holding.switch',
        changed_by=head_employee.id,
        before={
            'org_id': str(head_org_id),
            'employee_id': str(head_employee.id),
        },
        after={
            'org_id': str(child_org_id),
            'shadow_employee_id': str(shadow.id),
            'shadow_employee_code': shadow.employee_code,
        },
        summary=f'Переключение в КФХ «{child.name}»',
    )
    # Mirror in child org for local audit trail (changed_by = shadow after switch).
    await log_change(
        db,
        org_id=child_org_id,
        entity_type='holding_session',
        entity_id=head_org_id,
        action='holding.switch',
        changed_by=shadow.id,
        before={
            'from_head_org_id': str(head_org_id),
            'from_head_employee_id': str(head_employee.id),
        },
        after={'org_id': str(child_org_id)},
        summary=f'Вход из головной «{head.name}»',
    )

    return HoldingSwitchResponse(
        access_token=access_token,
        employee=employee_to_me(shadow),
        mode='child',
        current_org_id=child.id,
        current_org_name=child.name,
        head_org_id=head.id,
        head_org_name=head.name,
    )


async def switch_back_to_head(
    db: AsyncSession,
    *,
    current_employee: Employee,
    current_org_id: UUID,
    token_payload: dict,
) -> HoldingSwitchResponse:
    head_org_raw = token_payload.get(CLAIM_ACTING_FROM_HEAD_ORG_ID)
    head_emp_raw = token_payload.get(CLAIM_ACTING_HEAD_EMPLOYEE_ID)
    if head_org_raw is None or head_emp_raw is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Текущая сессия не является переключением в КФХ',
        )

    try:
        head_org_id = UUID(str(head_org_raw))
        head_employee_id = UUID(str(head_emp_raw))
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        ) from exc

    link = await get_link_by_child(db, current_org_id)
    if link is None or link.head_org_id != head_org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Связь с головной организацией недействительна',
        )

    if current_employee.org_id != current_org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Недействительный токен',
        )

    head_employee = await db.get(Employee, head_employee_id)
    if (
        head_employee is None
        or not head_employee.is_active
        or head_employee.org_id != head_org_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Учётка в головной организации недоступна',
        )

    head = await _get_org(db, head_org_id)
    child = await _get_org(db, current_org_id)

    access_token = create_access_token(
        {
            'sub': str(head_employee.id),
            'org_id': str(head_org_id),
        }
    )

    await log_change(
        db,
        org_id=head_org_id,
        entity_type='holding_session',
        entity_id=current_org_id,
        action='holding.switch_back',
        changed_by=head_employee.id,
        before={
            'org_id': str(current_org_id),
            'shadow_employee_id': str(current_employee.id),
        },
        after={
            'org_id': str(head_org_id),
            'employee_id': str(head_employee.id),
        },
        summary=f'Возврат из КФХ «{child.name}»',
    )
    await log_change(
        db,
        org_id=current_org_id,
        entity_type='holding_session',
        entity_id=head_org_id,
        action='holding.switch_back',
        changed_by=current_employee.id,
        before={'org_id': str(current_org_id)},
        after={'org_id': str(head_org_id)},
        summary=f'Выход в головную «{head.name}»',
    )

    return HoldingSwitchResponse(
        access_token=access_token,
        employee=employee_to_me(head_employee),
        mode='head',
        current_org_id=head.id,
        current_org_name=head.name,
        head_org_id=None,
        head_org_name=None,
    )
