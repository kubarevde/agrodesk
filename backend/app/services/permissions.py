"""Role-based section access stored in organization.settings.role_permissions."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies.auth import get_current_employee
from app.models.employee import Employee, EmployeeRole
from app.models.organization import Organization

# Keys match frontend route prefixes (without leading slash).
SECTION_KEYS: tuple[str, ...] = (
    'my-shift',
    'dashboard',
    'worktime',
    'agro-calendar',
    'sharing',
    'fields',
    'equipment',
    'implements',
    'maintenance',
    'purchase-planner',
    'inventory',
    'shipments',
    'expenses',
    'analytics',
    'reports',
    'employees',
    'audit-log',
    'settings',
)

SECTION_LABELS: dict[str, str] = {
    'my-shift': 'Моя смена',
    'dashboard': 'Дашборд',
    'worktime': 'Смены',
    'agro-calendar': 'Агрокалендарь',
    'sharing': 'Шеринг',
    'fields': 'Поля',
    'equipment': 'Техника',
    'implements': 'Приспособления',
    'maintenance': 'Ремонт и обслуживание',
    'purchase-planner': 'Планировщик закупок',
    'inventory': 'Склад ТМЦ',
    'shipments': 'Отгрузки',
    'expenses': 'Затраты',
    'analytics': 'Прогноз и оптимизация',
    'reports': 'Отчёты',
    'employees': 'Сотрудники',
    'audit-log': 'История изменений',
    'settings': 'Настройки',
}

DEFAULT_MANAGER_SECTIONS: list[str] = list(SECTION_KEYS)
DEFAULT_EMPLOYEE_SECTIONS: list[str] = ['my-shift', 'sharing']


def _settings_dict(org: Organization) -> dict[str, Any]:
    raw = org.settings if isinstance(org.settings, dict) else {}
    return dict(raw)


def default_role_permissions() -> dict[str, list[str]]:
    return {
        'manager': list(DEFAULT_MANAGER_SECTIONS),
        'employee': list(DEFAULT_EMPLOYEE_SECTIONS),
    }


def normalize_role_permissions(raw: Any) -> dict[str, list[str]]:
    """Merge stored permissions with defaults; ignore unknown section keys."""
    defaults = default_role_permissions()
    if not isinstance(raw, dict):
        return defaults
    valid = set(SECTION_KEYS)
    result: dict[str, list[str]] = {}
    for role in ('manager', 'employee'):
        stored = raw.get(role)
        if isinstance(stored, list):
            cleaned = [s for s in stored if isinstance(s, str) and s in valid]
            result[role] = cleaned if cleaned else defaults[role]
        else:
            result[role] = defaults[role]
    return result


def role_permissions_from_settings(settings: dict[str, Any]) -> dict[str, list[str]]:
    return normalize_role_permissions(settings.get('role_permissions'))


async def get_org_permissions(
    db: AsyncSession, org_id: UUID
) -> dict[str, list[str]]:
    result = await db.execute(select(Organization).where(Organization.id == org_id))
    org = result.scalar_one_or_none()
    if org is None:
        return default_role_permissions()
    return role_permissions_from_settings(_settings_dict(org))


def allowed_sections_for_role(
    role: EmployeeRole | str,
    permissions: dict[str, list[str]],
) -> list[str]:
    if role == EmployeeRole.admin or role == 'admin':
        return list(SECTION_KEYS)
    role_key = role.value if isinstance(role, EmployeeRole) else str(role)
    if role_key == 'manager':
        return permissions.get('manager', DEFAULT_MANAGER_SECTIONS)
    if role_key == 'employee':
        return permissions.get('employee', DEFAULT_EMPLOYEE_SECTIONS)
    return []


def section_from_path(path: str) -> str | None:
    """Map URL path to section key, e.g. /analytics/forecast -> analytics."""
    normalized = path.strip('/')
    if not normalized:
        return None
    first = normalized.split('/')[0]
    if first in SECTION_KEYS:
        return first
    return None


def role_has_section(
    role: EmployeeRole | str,
    section: str,
    permissions: dict[str, list[str]],
) -> bool:
    return section in allowed_sections_for_role(role, permissions)


def require_section_dep(section: str):
    """FastAPI dependency: enforce section access for non-admin roles."""

    async def _checker(
        employee: Employee = Depends(get_current_employee),
        db: AsyncSession = Depends(get_db),
    ) -> Employee:
        if employee.role == EmployeeRole.admin:
            return employee
        perms = await get_org_permissions(db, employee.org_id)
        if not role_has_section(employee.role, section, perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Раздел недоступен для вашей роли',
            )
        return employee

    return _checker


def require_manager_section(section: str):
    """Manager or admin with section access (employees always denied)."""

    async def _checker(
        employee: Employee = Depends(get_current_employee),
        db: AsyncSession = Depends(get_db),
    ) -> Employee:
        if employee.role == EmployeeRole.admin:
            return employee
        if employee.role != EmployeeRole.manager:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Недостаточно прав',
            )
        perms = await get_org_permissions(db, employee.org_id)
        if not role_has_section(employee.role, section, perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Раздел недоступен для вашей роли',
            )
        return employee

    return _checker
