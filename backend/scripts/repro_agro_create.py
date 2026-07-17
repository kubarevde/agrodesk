"""Reproduce POST /api/agro-plan create against local DB and print traceback."""

from __future__ import annotations

import asyncio
import traceback
from datetime import date

from sqlalchemy import select, text

from app.database import AsyncSessionLocal
from app.models.agro_plan import AgroPlan, AgroPlanField
from app.models.employee import Employee, EmployeeRole
from app.models.reference import Location, WorkType
from app.routers.agro_plan import get_plan_or_404, plan_to_response, validate_plan_refs


async def main() -> None:
    async with AsyncSessionLocal() as db:
        ver = await db.execute(text('SELECT version_num FROM alembic_version'))
        print('alembic:', ver.scalar())

        loc = (
            await db.execute(select(Location).where(Location.is_active.is_(True)).limit(1))
        ).scalar_one_or_none()
        wt = (
            await db.execute(select(WorkType).where(WorkType.is_active.is_(True)).limit(1))
        ).scalar_one_or_none()
        mgr = (
            await db.execute(
                select(Employee)
                .where(
                    Employee.role.in_([EmployeeRole.manager, EmployeeRole.admin]),
                    Employee.is_active.is_(True),
                )
                .limit(1)
            )
        ).scalar_one_or_none()
        assert loc and wt and mgr

        field_ids = [loc.id]
        try:
            await validate_plan_refs(db, loc.org_id, field_ids=field_ids, work_type_id=wt.id)
            plan = AgroPlan(
                location_id=field_ids[0],
                work_type_id=wt.id,
                planned_date=date(2026, 7, 20),
                notes='debug create',
                status='planned',
                created_by=mgr.id,
            )
            plan.fields = [AgroPlanField(location_id=fid) for fid in field_ids]
            db.add(plan)
            await db.commit()
            print('committed', plan.id)
            loaded = await get_plan_or_404(db, plan.id, loc.org_id)
            resp = plan_to_response(loaded)
            print('response OK field_ids=', resp.field_ids, 'names=', resp.field_names)
            await db.delete(loaded)
            await db.commit()
            print('cleaned up')
        except Exception:
            await db.rollback()
            traceback.print_exc()


if __name__ == '__main__':
    asyncio.run(main())
