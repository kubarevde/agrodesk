"""
Action-level permissions (Level 2) for AgroDesk.

Priority when resolving effective access for an employee
(documented rule — keep FE help text in sync):

1. Admin → all sections + all actions.
2. If employee.access_group_id is set → group's sections + actions
   (group fully replaces role defaults for that employee).
3. Else → org role_permissions[role] for sections, plus
   default actions derived from those sections and role.

Individual role checkboxes (Settings → Доступы → по ролям) still apply
to everyone without a group. Assigning a group is the personal override.
"""

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
from app.services.permissions import (
    EMPLOYEE_LOCKED_SECTIONS,
    SECTION_KEYS,
    allowed_sections_for_role,
    get_org_permissions,
)
from app.services.org_features import (
    shipment_requests_enabled,
    strip_shipment_request_actions,
)

# Canonical action keys — keep in sync with src/lib/permissionActions.ts
ACTION_KEYS: tuple[str, ...] = (
    'shift.open_own',
    'shift.open_for_others',
    'shift.close_own',
    'shift.close_others',
    'inventory.operate',
    'inventory.manage_items',
    'purchase.create',
    'purchase.manage',
    'support.view_org_tickets',
    'shipment_requests.manage',
    'shipment_requests.execute',
)

ACTION_LABELS: dict[str, str] = {
    'shift.open_own': 'Открыть свою смену',
    'shift.open_for_others': 'Открыть смену за другого',
    'shift.close_own': 'Закрыть свою смену',
    'shift.close_others': 'Закрыть чужую смену',
    'inventory.operate': 'Приход / расход / корректировка ТМЦ',
    'inventory.manage_items': 'Управление позициями склада',
    'purchase.create': 'Создавать заявки на закупку',
    'purchase.manage': 'Управлять закупками (удаление, затраты)',
    'support.view_org_tickets': 'Видеть все обращения организации',
    'shipment_requests.manage': 'Управлять заявками на отгрузку ТМЦ',
    'shipment_requests.execute': 'Исполнять заявки на отгрузку ТМЦ',
}

# Actions implied by having a section (employee-safe baselines only).
# "For others" shift actions are NEVER implied here — only via MANAGER_EXTRA_ACTIONS
# or an explicit group checkbox.
SECTION_IMPLIED_ACTIONS: dict[str, tuple[str, ...]] = {
    'my-shift': ('shift.open_own', 'shift.close_own'),
    'worktime': ('shift.open_own', 'shift.close_own'),
    'inventory': ('inventory.operate',),
    'purchase-planner': ('purchase.create',),
    'shipments': ('shipment_requests.execute',),
}

# Extra actions for manager/admin roles when using role defaults (no group).
MANAGER_EXTRA_ACTIONS: tuple[str, ...] = (
    'inventory.manage_items',
    'purchase.manage',
    'shift.open_for_others',
    'shift.close_others',
    'shipment_requests.manage',
    'shipment_requests.execute',
)

SUPPLIER_PRESET_CODE = 'supplier'
SUPPLIER_PRESET_NAME = 'Снабженец'
SUPPLIER_PRESET_SECTIONS: tuple[str, ...] = (
    'my-shift',
    'purchase-planner',
    'inventory',
)
SUPPLIER_PRESET_ACTIONS: tuple[str, ...] = (
    'shift.open_own',
    'shift.close_own',
    'purchase.create',
    'purchase.manage',
    'inventory.operate',
    'inventory.manage_items',
)


def normalize_actions(raw: Any) -> list[str]:
    valid = set(ACTION_KEYS)
    if not isinstance(raw, list):
        return []
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in raw:
        if isinstance(item, str) and item in valid and item not in seen:
            seen.add(item)
            cleaned.append(item)
    return cleaned


def normalize_group_sections(raw: Any) -> list[str]:
    valid = set(SECTION_KEYS)
    if not isinstance(raw, list):
        return []
    seen: set[str] = set()
    cleaned: list[str] = []
    for item in raw:
        if isinstance(item, str) and item in valid and item not in seen:
            seen.add(item)
            cleaned.append(item)
    return cleaned


def actions_from_sections(sections: list[str], role: EmployeeRole | str) -> list[str]:
    """Derive Level-2 actions from Level-1 sections + role extras."""
    role_key = role.value if isinstance(role, EmployeeRole) else str(role)
    seen: set[str] = set()
    result: list[str] = []
    for section in sections:
        for action in SECTION_IMPLIED_ACTIONS.get(section, ()):
            if action not in seen:
                seen.add(action)
                result.append(action)
    if role_key in ('manager', 'admin'):
        for action in MANAGER_EXTRA_ACTIONS:
            if action not in seen and action in ACTION_KEYS:
                seen.add(action)
                result.append(action)
    return result


def _with_employee_baseline_sections(sections: list[str]) -> list[str]:
    merged = list(sections)
    for key in EMPLOYEE_LOCKED_SECTIONS:
        if key not in merged:
            merged.insert(0, key)
    return merged


async def _org_settings(db: AsyncSession, org_id: UUID) -> dict[str, Any]:
    org = await db.get(Organization, org_id)
    raw = org.settings if org is not None and isinstance(org.settings, dict) else {}
    return dict(raw)


def _apply_feature_flags(effective: dict[str, Any], settings: dict[str, Any]) -> dict[str, Any]:
    """Strip shipment-request actions when org feature flag is off."""
    if shipment_requests_enabled(settings):
        return effective
    actions = strip_shipment_request_actions(list(effective.get('actions') or []))
    return {**effective, 'actions': actions}


async def resolve_effective_permissions(
    db: AsyncSession,
    employee: Employee,
) -> dict[str, Any]:
    """Return {role, allowed_sections, actions, access_group_id, access_group_name}."""
    settings = await _org_settings(db, employee.org_id)

    if employee.role == EmployeeRole.admin:
        return _apply_feature_flags(
            {
                'role': 'admin',
                'allowed_sections': list(SECTION_KEYS),
                'actions': list(ACTION_KEYS),
                'access_group_id': None,
                'access_group_name': None,
            },
            settings,
        )

    # Eager-load group if relationship available; otherwise fetch by id.
    group = getattr(employee, 'access_group', None)
    if group is None and employee.access_group_id is not None:
        from app.models.access_group import AccessGroup

        group = await db.get(AccessGroup, employee.access_group_id)
        if group is not None and group.org_id != employee.org_id:
            group = None

    if group is not None:
        sections = normalize_group_sections(group.sections)
        if employee.role == EmployeeRole.employee:
            sections = _with_employee_baseline_sections(sections)
        actions = normalize_actions(group.actions)
        # Baseline actions for every granted section (no manager-only extras).
        for section in sections:
            for action in SECTION_IMPLIED_ACTIONS.get(section, ()):
                if action not in actions:
                    actions.append(action)
        return _apply_feature_flags(
            {
                'role': employee.role.value,
                'allowed_sections': sections,
                'actions': actions,
                'access_group_id': str(group.id),
                'access_group_name': group.name,
            },
            settings,
        )

    org_perms = await get_org_permissions(db, employee.org_id)
    sections = allowed_sections_for_role(employee.role, org_perms)
    actions = actions_from_sections(sections, employee.role)
    return _apply_feature_flags(
        {
            'role': employee.role.value,
            'allowed_sections': sections,
            'actions': actions,
            'access_group_id': None,
            'access_group_name': None,
        },
        settings,
    )


def employee_has_action(effective: dict[str, Any], action: str) -> bool:
    if effective.get('role') == 'admin':
        return True
    return action in (effective.get('actions') or [])


def employee_has_section(effective: dict[str, Any], section: str) -> bool:
    if effective.get('role') == 'admin':
        return True
    return section in (effective.get('allowed_sections') or [])


async def get_effective_permissions(
    employee: Employee = Depends(get_current_employee),
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    return await resolve_effective_permissions(db, employee)


def require_action(action: str):
    """FastAPI dependency: require a Level-2 action (admin always passes)."""

    if action not in ACTION_KEYS:
        raise ValueError(f'Unknown action: {action}')

    async def _checker(
        employee: Employee = Depends(get_current_employee),
        db: AsyncSession = Depends(get_db),
    ) -> Employee:
        if employee.role == EmployeeRole.admin:
            return employee
        effective = await resolve_effective_permissions(db, employee)
        if not employee_has_action(effective, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail='Недостаточно прав для этого действия',
            )
        return employee

    return _checker


def require_any_action(*actions: str):
    """FastAPI dependency: require at least one of the given Level-2 actions."""

    unknown = [action for action in actions if action not in ACTION_KEYS]
    if unknown:
        raise ValueError(f'Unknown action(s): {unknown}')
    if not actions:
        raise ValueError('require_any_action needs at least one action')

    async def _checker(
        employee: Employee = Depends(get_current_employee),
        db: AsyncSession = Depends(get_db),
    ) -> Employee:
        if employee.role == EmployeeRole.admin:
            return employee
        effective = await resolve_effective_permissions(db, employee)
        if any(employee_has_action(effective, action) for action in actions):
            return employee
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Недостаточно прав для этого действия',
        )

    return _checker


async def ensure_system_access_groups(db: AsyncSession, org_id: UUID) -> None:
    """Idempotently create the «Снабженец» preset for an organization."""
    from app.models.access_group import AccessGroup

    result = await db.execute(
        select(AccessGroup).where(
            AccessGroup.org_id == org_id,
            AccessGroup.code == SUPPLIER_PRESET_CODE,
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return
    db.add(
        AccessGroup(
            org_id=org_id,
            name=SUPPLIER_PRESET_NAME,
            code=SUPPLIER_PRESET_CODE,
            is_system=True,
            sections=list(SUPPLIER_PRESET_SECTIONS),
            actions=list(SUPPLIER_PRESET_ACTIONS),
        )
    )
    await db.flush()


__all__ = [
    'ACTION_KEYS',
    'ACTION_LABELS',
    'MANAGER_EXTRA_ACTIONS',
    'SECTION_IMPLIED_ACTIONS',
    'SUPPLIER_PRESET_ACTIONS',
    'SUPPLIER_PRESET_CODE',
    'SUPPLIER_PRESET_NAME',
    'SUPPLIER_PRESET_SECTIONS',
    'actions_from_sections',
    'ensure_system_access_groups',
    'employee_has_action',
    'employee_has_section',
    'get_effective_permissions',
    'normalize_actions',
    'normalize_group_sections',
    'require_action',
    'require_any_action',
    'resolve_effective_permissions',
]
