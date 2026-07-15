"""Backfill calculated_amount + rate_snapshot for closed shifts.

Usage:
  cd backend
  PYTHONPATH=. python scripts/backfill_shift_salary.py
  PYTHONPATH=. python scripts/backfill_shift_salary.py --dry-run
  PYTHONPATH=. python scripts/backfill_shift_salary.py --force
"""

from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import AsyncSessionLocal
from app.models.shift import Shift, ShiftStatus
from app.services.salary import apply_salary_to_shift


async def backfill(*, dry_run: bool, force: bool) -> int:
    async with AsyncSessionLocal() as db:
        query = (
            select(Shift)
            .options(selectinload(Shift.employee))
            .where(Shift.status == ShiftStatus.closed)
            .order_by(Shift.date.asc())
        )
        if not force:
            query = query.where(Shift.calculated_amount.is_(None))

        result = await db.execute(query)
        shifts = list(result.scalars().all())
        total = len(shifts)
        if total == 0:
            print('No closed shifts to backfill.')
            return 0

        print(f'Found {total} shifts to backfill (force={force})...')
        processed = 0
        errors = 0
        for index, shift in enumerate(shifts, start=1):
            try:
                if dry_run:
                    print(f'[{index}/{total}] would process {shift.id} date={shift.date}')
                else:
                    await apply_salary_to_shift(db, shift)
                    processed += 1
                    if index % 10 == 0 or index == total:
                        print(f'[{index}/{total}] processed...')
                        await db.commit()
            except Exception as exc:  # noqa: BLE001 — log and continue batch
                errors += 1
                print(f'ERROR shift {shift.id}: {exc}', file=sys.stderr)

        if not dry_run:
            await db.commit()

        print(f'Done. processed={processed} errors={errors} dry_run={dry_run}')
        return processed


def main() -> None:
    parser = argparse.ArgumentParser(description='Backfill shift salary fields')
    parser.add_argument('--dry-run', action='store_true', help='Only list shifts')
    parser.add_argument(
        '--force',
        action='store_true',
        help='Recompute even if calculated_amount already set',
    )
    args = parser.parse_args()
    asyncio.run(backfill(dry_run=args.dry_run, force=args.force))


if __name__ == '__main__':
    main()
