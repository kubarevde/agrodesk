"""Implement category icon/color overrides in Organization.settings (JSONB).

Does NOT touch org_dictionaries columns — styles live under:
  Organization.settings["implement_category_styles"] = {
    "<dictionary_code>": { "icon": "sprout", "color": "success" },
    ...
  }
"""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.models.dictionary import IMPLEMENT_CATEGORY_STYLE_DEFAULTS
from app.models.organization import Organization
from app.services.org_features import settings_dict

IMPLEMENT_CATEGORY_STYLES_KEY = 'implement_category_styles'

ALLOWED_ICONS = frozenset({'sprout', 'droplets', 'tractor', 'wheat', 'truck', 'wrench'})
ALLOWED_COLORS = frozenset({'success', 'blue', 'amber', 'orange', 'violet', 'muted'})


def styles_map(settings: Any) -> dict[str, dict[str, str]]:
    raw = settings_dict(settings).get(IMPLEMENT_CATEGORY_STYLES_KEY)
    if not isinstance(raw, dict):
        return {}
    out: dict[str, dict[str, str]] = {}
    for code, value in raw.items():
        if not isinstance(code, str) or not isinstance(value, dict):
            continue
        icon = value.get('icon')
        color = value.get('color')
        entry: dict[str, str] = {}
        if isinstance(icon, str) and icon in ALLOWED_ICONS:
            entry['icon'] = icon
        if isinstance(color, str) and color in ALLOWED_COLORS:
            entry['color'] = color
        if entry:
            out[code] = entry
    return out


def resolve_style(
    code: str,
    overrides: dict[str, dict[str, str]] | None = None,
) -> tuple[str | None, str | None]:
    """Return (icon, color): settings override → code defaults → (None, None)."""
    bag = overrides or {}
    override = bag.get(code) or {}
    default = IMPLEMENT_CATEGORY_STYLE_DEFAULTS.get(code)
    icon = override.get('icon') or (default[0] if default else None)
    color = override.get('color') or (default[1] if default else None)
    return icon, color


def normalize_style_payload(
    *,
    icon: str | None,
    color: str | None,
) -> dict[str, str]:
    entry: dict[str, str] = {}
    if icon is not None:
        key = icon.strip().lower()
        if key and key not in ALLOWED_ICONS:
            raise ValueError(f'Недопустимая иконка: {icon}')
        if key:
            entry['icon'] = key
    if color is not None:
        key = color.strip().lower()
        if key and key not in ALLOWED_COLORS:
            raise ValueError(f'Недопустимый цвет: {color}')
        if key:
            entry['color'] = key
    return entry


async def load_org_style_overrides(db: AsyncSession, org_id: UUID) -> dict[str, dict[str, str]]:
    result = await db.execute(select(Organization.settings).where(Organization.id == org_id))
    return styles_map(result.scalar_one_or_none())


async def upsert_category_style(
    db: AsyncSession,
    org_id: UUID,
    code: str,
    *,
    icon: str | None = None,
    color: str | None = None,
) -> dict[str, dict[str, str]]:
    """Merge icon/color for one dictionary code into org.settings. Returns full styles map."""
    org = await db.get(Organization, org_id)
    if org is None:
        raise ValueError('Организация не найдена')

    patch = normalize_style_payload(icon=icon, color=color)
    if not patch and icon is None and color is None:
        return styles_map(org.settings)

    bag = settings_dict(org.settings)
    styles = styles_map(bag)
    current = dict(styles.get(code) or {})
    if icon is not None:
        if patch.get('icon'):
            current['icon'] = patch['icon']
        else:
            current.pop('icon', None)
    if color is not None:
        if patch.get('color'):
            current['color'] = patch['color']
        else:
            current.pop('color', None)

    if current:
        styles[code] = current
    else:
        styles.pop(code, None)

    bag[IMPLEMENT_CATEGORY_STYLES_KEY] = styles
    org.settings = bag
    flag_modified(org, 'settings')
    db.add(org)
    return styles
