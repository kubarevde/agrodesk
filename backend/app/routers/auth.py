from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee, EmployeeRole
from app.models.organization import Organization
from app.schemas.auth import (
    BotTokenRequest,
    ChangePasswordRequest,
    EmployeeMe,
    LoginRequest,
    OrgPublicResponse,
    TokenResponse,
)
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter()


def employee_to_me(employee: Employee) -> EmployeeMe:
    return EmployeeMe(
        id=employee.id,
        employee_code=employee.employee_code,
        full_name=employee.full_name,
        position=employee.position,
        role=employee.role.value,
        hourly_rate=float(employee.hourly_rate or 0),
    )


async def resolve_login_employee(
    db: AsyncSession,
    *,
    login: str,
    org_id: UUID,
) -> Employee | None:
    """Find employee by employee_code or org owner_email (admin) within org."""
    login_normalized = login.strip()
    result = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.employee_code == login_normalized,
        )
    )
    employee = result.scalar_one_or_none()
    if employee is not None:
        return employee

    org_result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = org_result.scalar_one_or_none()
    if org is None or not org.owner_email:
        return None
    if org.owner_email.lower() != login_normalized.lower():
        return None

    admin_result = await db.execute(
        select(Employee).where(
            Employee.org_id == org_id,
            Employee.role == EmployeeRole.admin,
            Employee.is_active.is_(True),
        ).order_by(Employee.created_at.asc())
    )
    return admin_result.scalars().first()


@router.get('/orgs', response_model=list[OrgPublicResponse])
async def list_public_orgs(db: AsyncSession = Depends(get_db)) -> list[OrgPublicResponse]:
    result = await db.execute(
        select(Organization)
        .where(Organization.is_active.is_(True))
        .order_by(Organization.name.asc())
    )
    return [
        OrgPublicResponse(id=org.id, name=org.name, slug=org.slug)
        for org in result.scalars().all()
    ]


@router.post('/login', response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    org_result = await db.execute(
        select(Organization).where(
            Organization.id == payload.org_id,
            Organization.is_active.is_(True),
        )
    )
    if org_result.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Организация не найдена или заблокирована',
        )

    employee = await resolve_login_employee(db, login=payload.email, org_id=payload.org_id)

    if employee is None:
        elsewhere = await db.execute(
            select(Employee.id)
            .where(
                Employee.employee_code == payload.email.strip(),
                Employee.is_active.is_(True),
            )
            .limit(1)
        )
        if elsewhere.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Вы не являетесь сотрудником этой организации',
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )

    if employee.org_id != payload.org_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Вы не являетесь сотрудником этой организации',
        )

    if not verify_password(payload.password, employee.password_hash) or not employee.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )

    access_token = create_access_token(
        {'sub': str(employee.id), 'org_id': str(payload.org_id)}
    )
    return TokenResponse(access_token=access_token, employee=employee_to_me(employee))


@router.post('/bot-token', response_model=TokenResponse)
async def bot_token(payload: BotTokenRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    if payload.secret != settings.bot_internal_secret:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Неверный секрет')

    result = await db.execute(
        select(Employee).where(
            Employee.telegram_id == payload.telegram_id,
            Employee.is_active.is_(True),
        )
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Telegram ID не привязан к сотруднику',
        )

    if employee.org_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Организация не назначена',
        )

    access_token = create_access_token(
        {'sub': str(employee.id), 'org_id': str(employee.org_id)}
    )
    return TokenResponse(access_token=access_token, employee=employee_to_me(employee))


@router.get('/me', response_model=EmployeeMe)
async def me(employee: Employee = Depends(get_current_employee)) -> EmployeeMe:
    return employee_to_me(employee)


@router.post('/change-password', status_code=status.HTTP_204_NO_CONTENT)
async def change_password(
    payload: ChangePasswordRequest,
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, employee.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Неверный текущий пароль',
        )

    employee.password_hash = hash_password(payload.new_password)
    db.add(employee)
    await db.commit()
