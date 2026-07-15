from datetime import date
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.superadmin import require_superadmin
from app.models.employee import Employee, EmployeeRole
from app.models.organization import Organization, SuperAdminUser
from app.models.shift import Shift, ShiftStatus
from app.schemas.superadmin import (
    OrganizationCreate,
    OrganizationCreateResponse,
    OrganizationResponse,
    OrganizationUpdate,
    SuperAdminLoginRequest,
    SuperAdminSeedRequest,
    SuperAdminStatsResponse,
    SuperAdminTokenResponse,
)
from app.services.auth import create_access_token, hash_password, verify_password

router = APIRouter()


async def _employees_count(db: AsyncSession, org_id: UUID) -> int:
    count = await db.scalar(
        select(func.count()).select_from(Employee).where(Employee.org_id == org_id)
    )
    return int(count or 0)


async def _active_shifts_count(db: AsyncSession, org_id: UUID) -> int:
    count = await db.scalar(
        select(func.count())
        .select_from(Shift)
        .where(Shift.org_id == org_id, Shift.status == ShiftStatus.open)
    )
    return int(count or 0)


async def org_to_response(db: AsyncSession, org: Organization) -> OrganizationResponse:
    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        plan=org.plan,
        is_active=org.is_active,
        owner_email=org.owner_email,
        created_at=org.created_at,
        trial_ends_at=org.trial_ends_at,
        max_employees=org.max_employees,
        employees_count=await _employees_count(db, org.id),
        active_shifts_count=await _active_shifts_count(db, org.id),
    )


async def get_org_or_404(db: AsyncSession, org_id: UUID) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Организация не найдена')
    return org


@router.post('/auth/login', response_model=SuperAdminTokenResponse)
async def login(
    payload: SuperAdminLoginRequest,
    db: AsyncSession = Depends(get_db),
) -> SuperAdminTokenResponse:
    result = await db.execute(
        select(SuperAdminUser).where(SuperAdminUser.email == payload.email.lower())
    )
    admin = result.scalar_one_or_none()
    if admin is None or not verify_password(payload.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail='Неверный email или пароль',
        )

    access_token = create_access_token(
        {'sub': str(admin.id), 'role': 'superadmin'}
    )
    return SuperAdminTokenResponse(access_token=access_token)


@router.post('/seed-superadmin', status_code=status.HTTP_201_CREATED)
async def seed_superadmin(
    payload: SuperAdminSeedRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    existing = await db.scalar(select(func.count()).select_from(SuperAdminUser))
    if int(existing or 0) > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Суперадмин уже существует',
        )

    admin = SuperAdminUser(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        is_active=True,
    )
    db.add(admin)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Email уже занят',
        ) from None
    await db.refresh(admin)
    return {'id': str(admin.id), 'email': admin.email}


@router.get('/organizations', response_model=list[OrganizationResponse])
async def list_organizations(
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[OrganizationResponse]:
    result = await db.execute(select(Organization).order_by(Organization.created_at.desc()))
    orgs = result.scalars().all()
    return [await org_to_response(db, org) for org in orgs]


@router.post(
    '/organizations',
    response_model=OrganizationCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_organization(
    payload: OrganizationCreate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> OrganizationCreateResponse:
    slug = payload.slug.lower()
    existing = await db.execute(select(Organization).where(Organization.slug == slug))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Организация с таким slug уже существует',
        )

    org = Organization(
        name=payload.name,
        slug=slug,
        owner_email=str(payload.owner_email).lower(),
        plan=payload.plan,
        max_employees=payload.max_employees,
        trial_ends_at=payload.trial_ends_at,
        is_active=True,
    )
    db.add(org)
    await db.flush()

    temp_password = str(uuid4())[:8]
    admin_code = f'ADM-{slug}'[:20]
    employee = Employee(
        org_id=org.id,
        employee_code=admin_code,
        full_name='Администратор',
        position='admin',
        role=EmployeeRole.admin,
        password_hash=hash_password(temp_password),
        hourly_rate=0,
        is_active=True,
    )
    db.add(employee)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Не удалось создать организацию',
        ) from None

    await db.refresh(org)
    return OrganizationCreateResponse(
        organization=await org_to_response(db, org),
        admin_email=str(payload.owner_email).lower(),
        temp_password=temp_password,
    )


@router.patch('/organizations/{org_id}', response_model=OrganizationResponse)
async def update_organization(
    org_id: UUID,
    payload: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> OrganizationResponse:
    org = await get_org_or_404(db, org_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(org, field, value)
    db.add(org)
    await db.commit()
    await db.refresh(org)
    return await org_to_response(db, org)


@router.delete('/organizations/{org_id}', status_code=status.HTTP_204_NO_CONTENT)
async def delete_organization(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> None:
    org = await get_org_or_404(db, org_id)
    org.is_active = False
    db.add(org)
    await db.commit()


@router.get('/stats', response_model=SuperAdminStatsResponse)
async def stats(
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> SuperAdminStatsResponse:
    total_orgs = int(await db.scalar(select(func.count()).select_from(Organization)) or 0)
    active_orgs = int(
        await db.scalar(
            select(func.count())
            .select_from(Organization)
            .where(Organization.is_active.is_(True))
        )
        or 0
    )
    trial_orgs = int(
        await db.scalar(
            select(func.count())
            .select_from(Organization)
            .where(Organization.plan == 'trial')
        )
        or 0
    )
    total_employees = int(await db.scalar(select(func.count()).select_from(Employee)) or 0)
    today = date.today()
    total_shifts_today = int(
        await db.scalar(
            select(func.count()).select_from(Shift).where(Shift.date == today)
        )
        or 0
    )
    return SuperAdminStatsResponse(
        total_orgs=total_orgs,
        active_orgs=active_orgs,
        trial_orgs=trial_orgs,
        total_employees=total_employees,
        total_shifts_today=total_shifts_today,
    )
