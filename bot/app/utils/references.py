"""Helpers for locations / work types / fields from AgroDesk API payloads."""

from __future__ import annotations

from typing import Any

# Aligned with backend migration 022 / field_work_location.py
FIELD_WORK_LOCATION_CODE = 'field_work'
FIELD_WORK_LOCATION_NAME = 'Полевая работа'

# Fallback names when API omits is_field_work (legacy payloads only).
_FIELD_WORK_NAMES = frozenset(
    {
        'Посев',
        'Уборка урожая',
        'Культивация',
        'Боронование',
        'Опрыскивание',
        'Полив',
        'Пахота',
    }
)


def find_by_name(items: list[dict[str, Any]], name: str) -> dict[str, Any] | None:
    needle = (name or '').strip()
    for item in items:
        if str(item.get('name', '')).strip() == needle:
            return item
    return None


def _coerce_bool(value: Any) -> bool | None:
    """Return True/False for known flag shapes, None if absent/unknown."""
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and value in (0, 1):
        return bool(value)
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {'1', 'true', 'yes', 'да', 'on'}:
            return True
        if normalized in {'0', 'false', 'no', 'нет', 'off', ''}:
            return False
    return None


def is_field_work_type(item: dict[str, Any] | None) -> bool:
    """Whether opening a shift with this work type requires field_id.

    Prefer explicit API flags (snake_case or camelCase), same as web
    ``isFieldWork``. Heuristics apply only when the flag is missing.
    Explicit ``false`` is respected (parity with ``WorkType.is_field_work``).
    """
    if not item:
        return False

    flagged = _coerce_bool(item.get('is_field_work'))
    if flagged is None:
        flagged = _coerce_bool(item.get('isFieldWork'))
    if flagged is not None:
        return flagged

    category = str(item.get('category') or '').lower()
    if 'поле' in category:
        return True

    name = str(item.get('name') or '').strip()
    return name in _FIELD_WORK_NAMES


def find_field_work_location(locations: list[dict[str, Any]]) -> dict[str, Any] | None:
    """System location «Полевая работа» (code=field_work), same as web/backend."""
    for item in locations:
        code = str(item.get('code') or '').strip()
        if code == FIELD_WORK_LOCATION_CODE:
            return item
    for item in locations:
        if bool(item.get('is_system') or item.get('isSystem')):
            name = str(item.get('name') or '').strip()
            if name == FIELD_WORK_LOCATION_NAME:
                return item
    for item in locations:
        if str(item.get('name') or '').strip() == FIELD_WORK_LOCATION_NAME:
            return item
    return None


def apply_field_work_location(
    locations: list[dict[str, Any]],
) -> tuple[str, str] | None:
    """Return (location_id, location_name) for field work, or None if missing."""
    item = find_field_work_location(locations)
    if not item or not item.get('id'):
        return None
    return str(item['id']), str(item.get('name') or FIELD_WORK_LOCATION_NAME)
