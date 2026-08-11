"""Organization settings (timezone etc.) for the current tenant."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.organization import Organization
from app.schemas.permissions import (
    ActionInfo,
    RolePermissionsResponse,
    RolePermissionsUpdate,
    SectionInfo,
)
from app.services.action_permissions import ACTION_KEYS, ACTION_LABELS
from app.services.audit import log_change, model_snapshot
from app.services.org_timezone import (
    AVAILABLE_TIMEZONES,
    DEFAULT_TIMEZONE,
    timezone_from_settings,
    validate_timezone_name,
)
from app.services.org_features import (
    PAYROLL_VISIBLE_TO_EMPLOYEES_KEY,
    SHIPMENT_REQUESTS_ENABLED_KEY,
    marketplace_enabled,
    payroll_visible_to_employees,
)
from app.services.permissions import (
    SECTION_KEYS,
    SECTION_LABELS,
    normalize_role_permissions,
    role_permissions_from_settings,
)

router = APIRouter()


class OrgSettingsResponse(BaseModel):
    timezone: str = DEFAULT_TIMEZONE
    available_timezones: list[str] = Field(default_factory=lambda: list(AVAILABLE_TIMEZONES))
    # Module is core: always reported enabled for org UI. Flag may still exist in JSONB
    # from older settings; API module gate treats absent/true as on (see org_features).
    shipment_requests_enabled: bool = True
    # Read-only for org UI — primary enablement is platform/superadmin (settings JSONB).
    marketplace_enabled: bool = False
    # Employer toggle: show monetary earnings to employees (default True when absent).
    payroll_visible_to_employees: bool = True
    # Organization creation time — used by «Факт и прогноз» chart window.
    created_at: str | None = None


class OrgSettingsUpdate(BaseModel):
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    # Writable by org admin — unlike marketplace_enabled / shipment_requests_enabled.
    payroll_visible_to_employees: bool | None = None
    # shipment_requests_enabled removed from org settings PATCH — module is always on.
    # marketplace_enabled is intentionally not writable here.


async def _get_org(db: AsyncSession, org_id: UUID) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail='Организация не найдена')
    return org


def _settings_dict(org: Organization) -> dict[str, Any]:
    raw = org.settings if isinstance(org.settings, dict) else {}
    return dict(raw)


@router.get('/organization', response_model=OrgSettingsResponse)
async def get_organization_settings(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(get_current_employee),
) -> OrgSettingsResponse:
    org = await _get_org(db, get_org_id(request))
    settings = _settings_dict(org)
    return OrgSettingsResponse(
        timezone=timezone_from_settings(settings),
        available_timezones=list(AVAILABLE_TIMEZONES),
        # Always expose as enabled — historical false flags must not hide the module in UI.
        shipment_requests_enabled=True,
        marketplace_enabled=marketplace_enabled(settings),
        payroll_visible_to_employees=payroll_visible_to_employees(settings),
        created_at=org.created_at.isoformat() if org.created_at is not None else None,
    )


@router.patch('/organization', response_model=OrgSettingsResponse)
async def update_organization_settings(
    request: Request,
    payload: OrgSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> OrgSettingsResponse:
    org = await _get_org(db, get_org_id(request))
    before = model_snapshot(org)
    settings = _settings_dict(org)

    tz = timezone_from_settings(settings)
    if payload.timezone is not None:
        try:
            tz = validate_timezone_name(payload.timezone)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Неизвестный часовой пояс',
            ) from exc
        settings['timezone'] = tz

    if payload.payroll_visible_to_employees is not None:
        settings[PAYROLL_VISIBLE_TO_EMPLOYEES_KEY] = bool(payload.payroll_visible_to_employees)

    # Persist core-on for legacy JSONB that may still say false.
    settings[SHIPMENT_REQUESTS_ENABLED_KEY] = True

    org.settings = settings
    flag_modified(org, 'settings')
    db.add(org)
    await log_change(db, org_id=org.id, entity_type='organization', entity_id=org.id,
                     action='update', changed_by=current.id, before=before, after=model_snapshot(org))
    await db.commit()
    await db.refresh(org)
    return OrgSettingsResponse(
        timezone=tz,
        available_timezones=list(AVAILABLE_TIMEZONES),
        shipment_requests_enabled=True,
        marketplace_enabled=marketplace_enabled(settings),
        payroll_visible_to_employees=payroll_visible_to_employees(settings),
        created_at=org.created_at.isoformat() if org.created_at is not None else None,
    )


@router.get('/role-permissions', response_model=RolePermissionsResponse)
async def get_role_permissions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> RolePermissionsResponse:
    org = await _get_org(db, get_org_id(request))
    return RolePermissionsResponse(
        sections=[SectionInfo(key=key, label=SECTION_LABELS[key]) for key in SECTION_KEYS],
        actions=[ActionInfo(key=key, label=ACTION_LABELS[key]) for key in ACTION_KEYS],
        permissions=role_permissions_from_settings(_settings_dict(org)),
    )


@router.patch('/role-permissions', response_model=RolePermissionsResponse)
async def update_role_permissions(
    request: Request,
    payload: RolePermissionsUpdate,
    db: AsyncSession = Depends(get_db),
    current: Employee = Depends(require_admin),
) -> RolePermissionsResponse:
    org = await _get_org(db, get_org_id(request))
    before = model_snapshot(org)
    settings = _settings_dict(org)
    settings['role_permissions'] = normalize_role_permissions(payload.permissions)
    org.settings = settings
    flag_modified(org, 'settings')
    db.add(org)
    await log_change(
        db,
        org_id=org.id,
        entity_type='organization',
        entity_id=org.id,
        action='update',
        changed_by=current.id,
        before=before,
        after=model_snapshot(org),
        summary='Обновлены права доступа ролей',
    )
    await db.commit()
    await db.refresh(org)
    return RolePermissionsResponse(
        sections=[SectionInfo(key=key, label=SECTION_LABELS[key]) for key in SECTION_KEYS],
        actions=[ActionInfo(key=key, label=ACTION_LABELS[key]) for key in ACTION_KEYS],
        permissions=role_permissions_from_settings(_settings_dict(org)),
    )
