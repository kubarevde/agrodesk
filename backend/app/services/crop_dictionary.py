"""Crop dictionary helpers: unify name (display) + code (stable key).

As-of inventory-harvest-audit / harvest-tmc-link:
- org_dictionaries type='crop' holds (code, name);
- locations.crop_type / shipments.crop_type — legacy display name (kept);
- locations.crop_code / shipments.crop_code / inventory_items.crop_code — preferred key.
"""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.dictionary import OrgDictionary, normalize_name

logger = logging.getLogger(__name__)


async def load_crop_rows(db: AsyncSession, org_id: UUID) -> list[OrgDictionary]:
    result = await db.execute(
        select(OrgDictionary).where(
            OrgDictionary.org_id == org_id,
            OrgDictionary.type == 'crop',
            OrgDictionary.is_active.is_(True),
        )
    )
    return list(result.scalars().all())


def unique_name_to_code(rows: list[OrgDictionary]) -> dict[str, str]:
    """Map normalized name → code only when the name is unambiguous."""
    buckets: dict[str, set[str]] = {}
    for row in rows:
        key = normalize_name(row.name).casefold()
        if not key:
            continue
        buckets.setdefault(key, set()).add(row.code)
    out: dict[str, str] = {}
    for key, codes in buckets.items():
        if len(codes) == 1:
            out[key] = next(iter(codes))
    return out


def code_to_name(rows: list[OrgDictionary]) -> dict[str, str]:
    return {row.code: row.name for row in rows if row.code}


def resolve_crop_pair(
    rows: list[OrgDictionary],
    *,
    crop_type: str | None = None,
    crop_code: str | None = None,
) -> tuple[str | None, str | None]:
    """Return (display_name, code) preferring explicit code, then unique name match."""
    by_code = code_to_name(rows)
    by_name = unique_name_to_code(rows)

    code = (crop_code or '').strip() or None
    name = normalize_name(crop_type) if crop_type else None
    name = name or None

    if code:
        resolved_name = by_code.get(code) or name
        return resolved_name, code

    if name:
        matched = by_name.get(name.casefold())
        if matched:
            return by_code.get(matched, name), matched
        # Ambiguous or unknown — keep display name, leave code empty
        return name, None

    return None, None


async def resolve_crop_pair_for_org(
    db: AsyncSession,
    org_id: UUID,
    *,
    crop_type: str | None = None,
    crop_code: str | None = None,
) -> tuple[str | None, str | None]:
    rows = await load_crop_rows(db, org_id)
    return resolve_crop_pair(rows, crop_type=crop_type, crop_code=crop_code)
