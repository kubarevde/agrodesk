"""Diagnose legacy Location.crop_* vs field_plantings (dry-run only).

Usage (from backend/):
  python -m scripts.diagnose_legacy_field_crops
  python -m scripts.diagnose_legacy_field_crops --org-id <uuid>
  python -m scripts.diagnose_legacy_field_crops --season-year 2026

Does NOT create plantings. Prints candidates and conflicts for manual migration.
"""

from __future__ import annotations

import argparse
import asyncio
from collections import defaultdict
from datetime import date
from uuid import UUID

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.field_planting import ACTIVE_AREA_STATUSES, FieldPlanting
from app.models.reference import Location


async def diagnose(*, org_id: UUID | None, season_year: int) -> None:
    async with AsyncSessionLocal() as db:
        fields_q = select(Location).where(
            Location.kind == 'field',
            Location.is_active.is_(True),
            Location.is_system.is_(False),
        )
        if org_id is not None:
            fields_q = fields_q.where(Location.org_id == org_id)
        fields = list((await db.execute(fields_q)).scalars().all())

        plantings_q = select(FieldPlanting).where(
            FieldPlanting.status.in_(ACTIVE_AREA_STATUSES),
            FieldPlanting.season_year == season_year,
        )
        if org_id is not None:
            plantings_q = plantings_q.where(FieldPlanting.org_id == org_id)
        plantings = list((await db.execute(plantings_q)).scalars().all())

        by_field: dict[UUID, list[FieldPlanting]] = defaultdict(list)
        for row in plantings:
            by_field[row.field_id].append(row)

        legacy_only: list[Location] = []
        conflicts: list[tuple[Location, list[str]]] = []
        safe_candidates: list[Location] = []

        for field in fields:
            legacy = (field.crop_code or field.crop_type or '').strip()
            if not legacy:
                continue
            rows = by_field.get(field.id, [])
            if not rows:
                legacy_only.append(field)
                has_full_contour = isinstance(field.polygon, list) and len(field.polygon) >= 3
                if has_full_contour and field.area_ha is not None:
                    safe_candidates.append(field)
                continue
            planting_codes = sorted({r.crop_code for r in rows})
            legacy_code = (field.crop_code or '').strip()
            if legacy_code and legacy_code not in planting_codes:
                conflicts.append((field, planting_codes))
            elif not legacy_code and field.crop_type:
                # Name-only legacy — flag if no planting name match possible
                conflicts.append((field, planting_codes))

        print(f'=== Legacy field crop diagnosis (season {season_year}) ===')
        print(f'Fields scanned: {len(fields)}')
        print(f'Legacy crop, no active plantings: {len(legacy_only)}')
        print(f'Safe migration candidates (legacy + full contour + area, no plantings): {len(safe_candidates)}')
        print(f'Conflicts (legacy differs from active plantings): {len(conflicts)}')
        print()

        if legacy_only:
            print('--- Legacy only (warn in UI; do not auto-create) ---')
            for f in legacy_only[:50]:
                print(
                    f'  {f.id} | {f.name!r} | legacy={f.crop_type or f.crop_code!r} | '
                    f'area={f.area_ha} | contour={"yes" if f.polygon else "no"}'
                )
            if len(legacy_only) > 50:
                print(f'  ... +{len(legacy_only) - 50} more')
            print()

        if safe_candidates:
            print('--- Dry-run safe candidates (NOT applied) ---')
            for f in safe_candidates[:50]:
                print(
                    f'  WOULD create planting: field={f.id} crop={f.crop_code or f.crop_type!r} '
                    f'season={season_year} area={f.area_ha} (full field polygon)'
                )
            print('  Re-run with explicit apply tooling when product confirms migration.')
            print()

        if conflicts:
            print('--- Conflicts (planting is source of truth; legacy ignored in UI) ---')
            for f, codes in conflicts[:50]:
                print(
                    f'  {f.id} | {f.name!r} | legacy={f.crop_type or f.crop_code!r} | '
                    f'plantings={codes}'
                )


def main() -> None:
    parser = argparse.ArgumentParser(description='Diagnose legacy Location crop vs plantings')
    parser.add_argument('--org-id', type=UUID, default=None)
    parser.add_argument('--season-year', type=int, default=date.today().year)
    args = parser.parse_args()
    asyncio.run(diagnose(org_id=args.org_id, season_year=args.season_year))


if __name__ == '__main__':
    main()
