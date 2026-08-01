"""Holding overlay: read-only allowlisted summaries for linked child orgs.

Does NOT widen /api/dashboard or /api/reports. Marketplace is excluded.
Data scope for each child metric is that child's org_id only.
"""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.expense import Expense
from app.models.inventory import InventoryItem
from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization
from app.models.shift import Shift, ShiftStatus
from app.models.shipment import Shipment
from app.models.shipment_request import ShipmentRequest, ShipmentRequestStatus
from app.schemas.holding import HoldingChildResponse, HoldingChildSummary, HoldingOverviewResponse
from app.services.dashboard import month_range, shift_hours
from app.services.holding_constants import HOLDING_SHADOW_POSITION
from app.services.org_hierarchy import list_children_for_head

# Re-export for callers that imported from holding historically.
_HOLDING_SHADOW_POSITION = HOLDING_SHADOW_POSITION


async def require_head_org(db: AsyncSession, org_id: UUID) -> None:
    """Raise 403 unless current org is a head in org_hierarchy_links."""
    exists = await db.scalar(
        select(OrgHierarchyLink.id)
        .where(OrgHierarchyLink.head_org_id == org_id)
        .limit(1)
    )
    if exists is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail='Организация не является головной или нет дочерних КФХ',
        )


async def list_holding_children(
    db: AsyncSession,
    head_org_id: UUID,
) -> list[HoldingChildResponse]:
    await require_head_org(db, head_org_id)
    views = await list_children_for_head(db, head_org_id)
    return [
        HoldingChildResponse(
            link_id=v.id,
            org_id=v.child_org_id,
            name=v.child_name,
            slug=v.child_slug,
            is_active=v.child_is_active,
        )
        for v in views
    ]


async def _child_summary(
    db: AsyncSession,
    *,
    org: Organization,
    today: date,
    now: datetime,
) -> HoldingChildSummary:
    month_start, month_end = month_range(today)

    employees_count = int(
        await db.scalar(
            select(func.count())
            .select_from(Employee)
            .where(
                Employee.org_id == org.id,
                Employee.is_active.is_(True),
                or_(
                    Employee.position.is_(None),
                    Employee.position != _HOLDING_SHADOW_POSITION,
                ),
            )
        )
        or 0
    )
    active_shifts_count = int(
        await db.scalar(
            select(func.count())
            .select_from(Shift)
            .where(Shift.org_id == org.id, Shift.status == ShiftStatus.open)
        )
        or 0
    )

    month_shifts_result = await db.execute(
        select(Shift).where(
            Shift.org_id == org.id,
            Shift.date >= month_start,
            Shift.date <= month_end,
        )
    )
    month_shifts = month_shifts_result.scalars().all()
    month_shifts_count = len(month_shifts)
    month_hours = round(sum(shift_hours(s, now) for s in month_shifts), 2)

    kg_total = await db.scalar(
        select(func.coalesce(func.sum(Shipment.quantity_kg), 0)).where(
            Shipment.org_id == org.id,
            Shipment.date >= month_start,
            Shipment.date <= month_end,
        )
    )
    sum_total = await db.scalar(
        select(
            func.coalesce(func.sum(Shipment.quantity_kg * Shipment.price_per_kg), 0)
        ).where(
            Shipment.org_id == org.id,
            Shipment.date >= month_start,
            Shipment.date <= month_end,
            Shipment.price_per_kg.is_not(None),
        )
    )

    month_expenses_sum = float(
        await db.scalar(
            select(func.coalesce(func.sum(Expense.amount), 0)).where(
                Expense.org_id == org.id,
                Expense.date >= month_start,
                Expense.date <= month_end,
            )
        )
        or 0
    )

    critical_inventory_count = int(
        await db.scalar(
            select(func.count())
            .select_from(InventoryItem)
            .where(
                InventoryItem.org_id == org.id,
                InventoryItem.is_active.is_(True),
                InventoryItem.current_stock < InventoryItem.min_stock,
            )
        )
        or 0
    )

    active_req_statuses = (
        ShipmentRequestStatus.new.value,
        ShipmentRequestStatus.in_progress.value,
    )
    shipment_requests_active = int(
        await db.scalar(
            select(func.count())
            .select_from(ShipmentRequest)
            .where(
                ShipmentRequest.org_id == org.id,
                ShipmentRequest.status.in_(active_req_statuses),
            )
        )
        or 0
    )

    return HoldingChildSummary(
        org_id=org.id,
        name=org.name,
        slug=org.slug,
        is_active=bool(org.is_active),
        employees_count=employees_count,
        active_shifts_count=active_shifts_count,
        month_shifts_count=month_shifts_count,
        month_hours=month_hours,
        month_shipments_kg=float(kg_total or 0),
        month_shipments_sum=float(sum_total or 0),
        month_expenses_sum=month_expenses_sum,
        critical_inventory_count=critical_inventory_count,
        shipment_requests_active=shipment_requests_active,
    )


def _sum_summaries(
    head_org_id: UUID,
    children: list[HoldingChildSummary],
) -> HoldingChildSummary:
    return HoldingChildSummary(
        org_id=head_org_id,
        name='Итого',
        slug='totals',
        is_active=True,
        employees_count=sum(c.employees_count for c in children),
        active_shifts_count=sum(c.active_shifts_count for c in children),
        month_shifts_count=sum(c.month_shifts_count for c in children),
        month_hours=round(sum(c.month_hours for c in children), 2),
        month_shipments_kg=round(sum(c.month_shipments_kg for c in children), 2),
        month_shipments_sum=round(sum(c.month_shipments_sum for c in children), 2),
        month_expenses_sum=round(sum(c.month_expenses_sum for c in children), 2),
        critical_inventory_count=sum(c.critical_inventory_count for c in children),
        shipment_requests_active=sum(c.shipment_requests_active for c in children),
    )


async def get_holding_overview(
    db: AsyncSession,
    head_org_id: UUID,
) -> HoldingOverviewResponse:
    await require_head_org(db, head_org_id)
    views = await list_children_for_head(db, head_org_id)
    today = date.today()
    now = datetime.now()
    summaries: list[HoldingChildSummary] = []
    for view in views:
        org = await db.get(Organization, view.child_org_id)
        if org is None:
            continue
        summaries.append(await _child_summary(db, org=org, today=today, now=now))

    return HoldingOverviewResponse(
        head_org_id=head_org_id,
        children=summaries,
        totals=_sum_summaries(head_org_id, summaries) if summaries else None,
    )
