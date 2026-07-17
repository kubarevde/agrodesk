"""Centralized audit logging — same DB session as the business write (no extra commit)."""

from __future__ import annotations

import logging
from datetime import date, datetime, time
from decimal import Decimal
from enum import Enum
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.inspection import inspect as sa_inspect

from app.models.audit_log import AuditLog

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = frozenset(
    {
        'password',
        'password_hash',
        'hashed_password',
        'token',
        'access_token',
        'refresh_token',
        'secret',
        'bot_internal_secret',
        'api_key',
    }
)

ENTITY_TYPE_LABELS: dict[str, str] = {
    'employee': 'Сотрудник',
    'shift': 'Смена',
    'inventory_item': 'ТМЦ',
    'inventory_operation': 'Операция ТМЦ',
    'expense': 'Затрата',
    'shipment': 'Отгрузка',
    'equipment': 'Техника',
    'equipment_maintenance': 'Ремонт и ТО',
    'equipment_meter_log': 'Показания счётчика',
    'implement': 'Приспособление',
    'implement_maintenance': 'ТО приспособления',
    'maintenance_checklist_item': 'Пункт чек-листа ремонта',
    'agro_plan': 'Задача агрокалендаря',
    'employee_rate': 'Ставка оплаты',
    'location': 'Объект / поле',
    'work_type': 'Тип работ',
    'dictionary_item': 'Справочник',
    'purchase_planner': 'Планировщик закупок',
    'organization': 'Организация',
}

ACTION_LABELS: dict[str, str] = {
    'create': 'Создание',
    'update': 'Изменение',
    'delete': 'Удаление',
}


def entity_type_label(entity_type: str) -> str:
    return ENTITY_TYPE_LABELS.get(entity_type, entity_type)


def _jsonable(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): _jsonable(v) for k, v in value.items() if str(k).lower() not in SENSITIVE_KEYS}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return str(value)


def sanitize_payload(data: dict[str, Any] | None) -> dict[str, Any] | None:
    if data is None:
        return None
    return {
        key: _jsonable(value)
        for key, value in data.items()
        if key.lower() not in SENSITIVE_KEYS
    }


def model_snapshot(obj: Any, *, extra_exclude: frozenset[str] | None = None) -> dict[str, Any]:
    """Plain column values from an ORM instance (no relationships)."""
    exclude = SENSITIVE_KEYS | (extra_exclude or frozenset())
    mapper = sa_inspect(type(obj))
    data: dict[str, Any] = {}
    for column in mapper.columns:
        key = column.key
        if key.lower() in exclude:
            continue
        data[key] = _jsonable(getattr(obj, key, None))
    return data


def build_summary(
    action: str,
    entity_type: str,
    *,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    hint: str | None = None,
) -> str:
    if hint:
        return hint
    label = entity_type_label(entity_type)
    action_label = ACTION_LABELS.get(action, action)
    name = None
    for source in (after, before):
        if not source:
            continue
        for key in ('full_name', 'name', 'employee_code', 'category', 'description', 'title'):
            value = source.get(key)
            if value:
                name = str(value)
                break
        if name:
            break
    if name:
        return f'{action_label}: {label} «{name}»'
    return f'{action_label}: {label}'


async def log_change(
    db: AsyncSession,
    *,
    org_id: UUID,
    entity_type: str,
    entity_id: UUID,
    action: str,
    changed_by: UUID | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
    summary: str | None = None,
) -> None:
    """Queue an audit row on the current session. Caller commits the business transaction."""
    if entity_type == 'audit_log':
        return
    try:
        before_clean = sanitize_payload(before)
        after_clean = sanitize_payload(after)
        row = AuditLog(
            org_id=org_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            changed_by=changed_by,
            before_data=before_clean,
            after_data=after_clean,
            summary=summary
            or build_summary(action, entity_type, before=before_clean, after=after_clean),
        )
        db.add(row)
    except Exception:
        # Never fail the main business operation because of audit
        logger.exception(
            'audit log_change failed entity_type=%s entity_id=%s action=%s',
            entity_type,
            entity_id,
            action,
        )
