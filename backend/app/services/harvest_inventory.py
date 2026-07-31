"""Harvest ↔ inventory ↔ shipment_requests linkage helpers.

Domain rules (docs/shipments.md, docs/harvest-tmc-link.md):
- category code ``harvest`` marks inventory items that represent crop product on stock;
- harvest SKUs MUST have ``crop_code`` (org dictionary type=crop);
- non-harvest categories MUST NOT store ``crop_code``;
- shipment_requests.kind is ``harvest`` | ``inventory`` (derived from item category on create);
- completing a request ALWAYS posts inventory_operations only (never auto ``shipments``);
- crop KPI / forecast stay on ``shipments`` only — never from inventory_operations.
"""

from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

HARVEST_INVENTORY_CATEGORY = 'harvest'
REQUEST_KIND_INVENTORY = 'inventory'
REQUEST_KIND_HARVEST = 'harvest'


def is_harvest_inventory_category(category: str | None) -> bool:
    if not category:
        return False
    return str(category).strip().lower() == HARVEST_INVENTORY_CATEGORY


def request_kind_for_category(category: str | None) -> str:
    """Map warehouse item category → shipment_request.kind."""
    if is_harvest_inventory_category(category):
        return REQUEST_KIND_HARVEST
    return REQUEST_KIND_INVENTORY


def normalize_item_crop_code(category: str | None, crop_code: str | None) -> str | None:
    """Return crop_code for harvest items; None for all other categories."""
    if not is_harvest_inventory_category(category):
        return None
    code = (crop_code or '').strip() or None
    if code and code.lower() in {'none', 'null', 'undefined'}:
        code = None
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Для позиций «Урожай на складе» необходимо указать культуру.',
        )
    return code


async def resolve_inventory_crop_code(
    db: AsyncSession,
    org_id: UUID,
    *,
    category: str | None,
    crop_code: str | None,
) -> str | None:
    """Validate and normalize crop_code for inventory item writes."""
    code = normalize_item_crop_code(category, crop_code)
    if code is None:
        return None
    from app.services.crop_dictionary import code_to_name, load_crop_rows

    rows = await load_crop_rows(db, org_id)
    known = code_to_name(rows)
    if code not in known:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Неизвестная культура',
        )
    return code
