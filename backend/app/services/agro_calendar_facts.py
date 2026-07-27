"""Link closed field shifts to agro calendar plans/facts."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.agro_plan import AgroPlan, AgroPlanField
from app.models.reference import Location, WorkType
from app.models.shift import Shift


async def is_field_work_type(db: AsyncSession, work_type_id: UUID) -> bool:
    work_type = await db.get(WorkType, work_type_id)
    if work_type is None:
        return False
    return bool(getattr(work_type, 'is_field_work', False))


async def get_selectable_plan(
    db: AsyncSession,
    *,
    org_id: UUID,
    plan_id: UUID,
    employee_id: UUID,
) -> AgroPlan | None:
    result = await db.execute(
        select(AgroPlan)
        .join(Location, AgroPlan.location_id == Location.id)
        .options(
            selectinload(AgroPlan.fields),
            selectinload(AgroPlan.location),
            selectinload(AgroPlan.work_type),
        )
        .where(
            AgroPlan.id == plan_id,
            Location.org_id == org_id,
            AgroPlan.entry_kind == 'plan',
            AgroPlan.status.in_(['planned', 'in_progress']),
            or_(AgroPlan.employee_id.is_(None), AgroPlan.employee_id == employee_id),
        )
    )
    return result.scalar_one_or_none()


def _sync_plan_resources_from_shift(plan: AgroPlan, shift: Shift) -> None:
    plan.actual_shift_id = shift.id
    plan.employee_id = shift.employee_id
    if shift.equipment_id is not None:
        plan.equipment_id = shift.equipment_id
    if shift.implement_id is not None:
        plan.implement_id = shift.implement_id


async def apply_shift_to_agro_calendar(
    db: AsyncSession,
    *,
    org_id: UUID,
    shift: Shift,
) -> AgroPlan | None:
    """On close: complete linked plan or create a fact for field work."""
    if not await is_field_work_type(db, shift.work_type_id):
        return None
    if shift.field_id is None:
        return None

    if shift.agro_plan_id is not None:
        plan = await db.get(AgroPlan, shift.agro_plan_id)
        if plan is None:
            # Linked plan missing — fall through to fact creation
            pass
        elif getattr(plan, 'entry_kind', 'plan') != 'plan':
            # Should not link a fact as selected plan; no-op
            return plan
        elif plan.status in ('planned', 'in_progress'):
            plan.status = 'done'
            plan.closed_by = shift.employee_id
            plan.closed_at = datetime.now(timezone.utc)
            _sync_plan_resources_from_shift(plan, shift)
            db.add(plan)
            return plan
        else:
            # Already done/cancelled — do not create a duplicate fact
            if plan.actual_shift_id is None:
                plan.actual_shift_id = shift.id
                db.add(plan)
            return plan

    # Field work without selected plan → create fact entry
    # Avoid duplicate facts for the same shift
    existing = await db.execute(
        select(AgroPlan).where(
            AgroPlan.actual_shift_id == shift.id,
            AgroPlan.entry_kind == 'fact',
        )
    )
    existing_fact = existing.scalar_one_or_none()
    if existing_fact is not None:
        return existing_fact

    fact = AgroPlan(
        location_id=shift.field_id,
        work_type_id=shift.work_type_id,
        planned_date=shift.date,
        planned_end_date=None,
        equipment_id=shift.equipment_id,
        implement_id=shift.implement_id,
        employee_id=shift.employee_id,
        notes=None,
        status='done',
        entry_kind='fact',
        actual_shift_id=shift.id,
        created_by=shift.employee_id,
        closed_by=shift.employee_id,
        closed_at=datetime.now(timezone.utc),
    )
    db.add(fact)
    await db.flush()
    db.add(AgroPlanField(plan_id=fact.id, location_id=shift.field_id))
    return fact
