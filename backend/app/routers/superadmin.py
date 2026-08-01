from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

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
    OrgHierarchyAttachRequest,
    OrgHierarchyCandidateResponse,
    OrgHierarchyChildResponse,
    OrgHierarchyParentResponse,
    SuperAdminLoginRequest,
    SuperAdminSeedRequest,
    SuperAdminStatsResponse,
    SuperAdminTokenResponse,
)
from app.services.auth import create_access_token, hash_password, verify_password
from app.services.org_features import MARKETPLACE_ENABLED_KEY, marketplace_enabled, settings_dict
from app.services.org_hierarchy import (
    OrgHierarchyError,
    attach_child,
    detach_child,
    get_parent_for_child,
    list_attach_candidates,
    list_children_for_head,
)
from app.services.superadmin_stats import build_superadmin_stats

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
        marketplace_enabled=marketplace_enabled(org.settings),
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
    market_flag = data.pop('marketplace_enabled', None)
    for field, value in data.items():
        setattr(org, field, value)
    if market_flag is not None:
        bag = settings_dict(org.settings)
        bag[MARKETPLACE_ENABLED_KEY] = bool(market_flag)
        org.settings = dict(bag)
        flag_modified(org, 'settings')
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


@router.get(
    '/organizations/{org_id}/children',
    response_model=list[OrgHierarchyChildResponse],
)
async def list_organization_children(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[OrgHierarchyChildResponse]:
    await get_org_or_404(db, org_id)
    views = await list_children_for_head(db, org_id)
    return [
        OrgHierarchyChildResponse(
            id=v.id,
            head_org_id=v.head_org_id,
            child_org_id=v.child_org_id,
            child_name=v.child_name,
            child_slug=v.child_slug,
            child_is_active=v.child_is_active,
        )
        for v in views
    ]


@router.get(
    '/organizations/{org_id}/parent',
    response_model=OrgHierarchyParentResponse | None,
)
async def get_organization_parent(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> OrgHierarchyParentResponse | None:
    """Return head link if this org is a child; null if standalone / head-only."""
    await get_org_or_404(db, org_id)
    view = await get_parent_for_child(db, org_id)
    if view is None:
        return None
    return OrgHierarchyParentResponse(
        link_id=view.link_id,
        head_org_id=view.head_org_id,
        head_name=view.head_name,
        head_slug=view.head_slug,
        head_is_active=view.head_is_active,
    )


@router.get(
    '/organizations/{org_id}/children/available',
    response_model=list[OrgHierarchyCandidateResponse],
)
async def list_organization_children_available(
    org_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> list[OrgHierarchyCandidateResponse]:
    try:
        candidates = await list_attach_candidates(db, org_id)
    except OrgHierarchyError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    return [
        OrgHierarchyCandidateResponse(id=c.id, name=c.name, slug=c.slug)
        for c in candidates
    ]


@router.post(
    '/organizations/{org_id}/children',
    response_model=OrgHierarchyChildResponse,
    status_code=status.HTTP_201_CREATED,
)
async def attach_organization_child(
    org_id: UUID,
    payload: OrgHierarchyAttachRequest,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> OrgHierarchyChildResponse:
    try:
        link = await attach_child(
            db,
            head_org_id=org_id,
            child_org_id=payload.child_org_id,
        )
        await db.commit()
        await db.refresh(link)
    except OrgHierarchyError as exc:
        await db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail='Не удалось создать связь организаций',
        ) from None

    views = await list_children_for_head(db, org_id)
    match = next((v for v in views if v.child_org_id == payload.child_org_id), None)
    if match is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Связь создана, но не найдена при чтении',
        )
    return OrgHierarchyChildResponse(
        id=match.id,
        head_org_id=match.head_org_id,
        child_org_id=match.child_org_id,
        child_name=match.child_name,
        child_slug=match.child_slug,
        child_is_active=match.child_is_active,
    )


@router.delete(
    '/organizations/{org_id}/children/{child_org_id}',
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_organization_child(
    org_id: UUID,
    child_org_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> None:
    try:
        await detach_child(db, head_org_id=org_id, child_org_id=child_org_id)
        await db.commit()
    except OrgHierarchyError as exc:
        await db.rollback()
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


@router.get('/stats', response_model=SuperAdminStatsResponse)
async def stats(
    db: AsyncSession = Depends(get_db),
    _: SuperAdminUser = Depends(require_superadmin),
) -> SuperAdminStatsResponse:
    return await build_superadmin_stats(db)
