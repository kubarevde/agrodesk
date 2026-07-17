"""Organization settings (timezone etc.) for the current tenant."""

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee, require_admin
from app.middleware.org_context import get_org_id
from app.models.employee import Employee
from app.models.organization import Organization
from app.schemas.permissions import (
    RolePermissionsResponse,
    RolePermissionsUpdate,
    SectionInfo,
    UserPermissionsResponse,
)
from app.services.audit import log_change, model_snapshot
from app.services.org_timezone import DEFAULT_TIMEZONE, timezone_from_settings
from app.services.permissions import (
    SECTION_KEYS,
    SECTION_LABELS,
    normalize_role_permissions,
    role_permissions_from_settings,
)

router = APIRouter()

COMMON_TIMEZONES = [
    'Asia/Bangkok',
    'Asia/Novosibirsk',
    'Asia/Yekaterinburg',
    'Europe/Moscow',
    'Europe/Samara',
    'Asia/Krasnoyarsk',
    'Asia/Irkutsk',
    'Asia/Vladivostok',
    'UTC',
]


class OrgSettingsResponse(BaseModel):
    timezone: str = DEFAULT_TIMEZONE
    available_timezones: list[str] = Field(default_factory=lambda: list(COMMON_TIMEZONES))


class OrgSettingsUpdate(BaseModel):
    timezone: str = Field(min_length=1, max_length=64)


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
    return OrgSettingsResponse(timezone=timezone_from_settings(_settings_dict(org)))


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
    tz = payload.timezone.strip()
    if tz not in COMMON_TIMEZONES and tz != 'UTC':
        # Allow custom IANA zones but reject empty/space junk
        try:
            from zoneinfo import ZoneInfo

            ZoneInfo(tz)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Неизвестный часовой пояс',
            ) from exc
    settings['timezone'] = tz
    org.settings = settings
    db.add(org)
    await log_change(db, org_id=org.id, entity_type='organization', entity_id=org.id,
                     action='update', changed_by=current.id, before=before, after=model_snapshot(org))
    await db.commit()
    await db.refresh(org)
    return OrgSettingsResponse(timezone=tz)


@router.get('/role-permissions', response_model=RolePermissionsResponse)
async def get_role_permissions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: Employee = Depends(require_admin),
) -> RolePermissionsResponse:
    org = await _get_org(db, get_org_id(request))
    return RolePermissionsResponse(
        sections=[SectionInfo(key=key, label=SECTION_LABELS[key]) for key in SECTION_KEYS],
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
        permissions=role_permissions_from_settings(_settings_dict(org)),
    )
