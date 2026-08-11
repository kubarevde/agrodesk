"""QA: cross-check salary Expenses vs confirmed payroll lines (Prompt #4).

Not a public API — run manually:

  python -m app.scripts.payroll_expense_crosscheck --org-id <uuid> --from 2026-03-01 --to 2026-03-31

Or from tests via crosscheck_salary_expenses_vs_confirmed_lines().
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import date
from uuid import UUID

from sqlalchemy import select

from app.database import AsyncSessionLocal
from app.models.organization import Organization
from app.services.payroll_expenses import crosscheck_salary_expenses_vs_confirmed_lines


async def _run(org_id: UUID, period_start: date, period_end: date) -> dict:
    async with AsyncSessionLocal() as db:
        org = await db.scalar(select(Organization.id).where(Organization.id == org_id))
        if org is None:
            raise SystemExit(f'Organization not found: {org_id}')
        return await crosscheck_salary_expenses_vs_confirmed_lines(
            db,
            org_id=org_id,
            period_start=period_start,
            period_end=period_end,
        )


def main() -> None:
    parser = argparse.ArgumentParser(description='Payroll salary expense cross-check (QA)')
    parser.add_argument('--org-id', required=True, type=UUID)
    parser.add_argument('--from', dest='period_start', required=True, type=date.fromisoformat)
    parser.add_argument('--to', dest='period_end', required=True, type=date.fromisoformat)
    args = parser.parse_args()
    if args.period_end < args.period_start:
        raise SystemExit('--to must be >= --from')
    result = asyncio.run(_run(args.org_id, args.period_start, args.period_end))
    print(result)
    if not result['match']:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
