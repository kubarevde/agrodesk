"""Platform-wide superadmin overview metrics.

Separate from tenant `/api/dashboard` and holding `/api/holding/overview`.
Marketplace counts are isolated from core tenant usage.
No report-export usage (no telemetry table) — deferred.
"""

from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.employee import Employee
from app.models.marketplace import MarketListing, MarketOrder
from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization
from app.models.shift import Shift, ShiftStatus
from app.models.support_ticket import SupportTicket
from app.schemas.superadmin import (
    SuperAdminAttentionItem,
    SuperAdminStatsResponse,
)
from app.services.org_features import MARKETPLACE_ENABLED_KEY


def _i(value: object | None) -> int:
    return int(value or 0)


async def build_superadmin_stats(db: AsyncSession) -> SuperAdminStatsResponse:
    today = date.today()
    trial_horizon = today + timedelta(days=7)

    org_row = (
        await db.execute(
            select(
                func.count(),
                func.sum(case((Organization.is_active.is_(True), 1), else_=0)),
                func.sum(case((Organization.is_active.is_(False), 1), else_=0)),
                func.sum(case((Organization.plan == 'trial', 1), else_=0)),
                func.sum(case((Organization.plan == 'basic', 1), else_=0)),
                func.sum(case((Organization.plan == 'pro', 1), else_=0)),
                func.sum(
                    case(
                        (
                            Organization.settings.contains(
                                {MARKETPLACE_ENABLED_KEY: True}
                            ),
                            1,
                        ),
                        else_=0,
                    )
                ),
                func.sum(
                    case(
                        (
                            (Organization.plan == 'trial')
                            & (Organization.trial_ends_at.is_not(None))
                            & (Organization.trial_ends_at <= trial_horizon)
                            & (Organization.trial_ends_at >= today)
                            & Organization.is_active.is_(True),
                            1,
                        ),
                        else_=0,
                    )
                ),
                func.sum(
                    case(
                        (
                            (Organization.plan == 'trial')
                            & (Organization.trial_ends_at.is_not(None))
                            & (Organization.trial_ends_at < today)
                            & Organization.is_active.is_(True),
                            1,
                        ),
                        else_=0,
                    )
                ),
            ).select_from(Organization)
        )
    ).one()

    (
        total_orgs,
        active_orgs,
        inactive_orgs,
        trial_orgs,
        basic_orgs,
        pro_orgs,
        marketplace_orgs,
        trials_expiring_soon,
        trials_expired_active,
    ) = (_i(v) for v in org_row)

    emp_row = (
        await db.execute(
            select(
                func.count(),
                func.sum(case((Employee.is_active.is_(True), 1), else_=0)),
            ).select_from(Employee)
        )
    ).one()
    total_employees, active_employees = _i(emp_row[0]), _i(emp_row[1])

    shift_row = (
        await db.execute(
            select(
                func.sum(case((Shift.date == today, 1), else_=0)),
                func.sum(case((Shift.status == ShiftStatus.open, 1), else_=0)),
                func.sum(
                    case(
                        (
                            (Shift.date == today) & (Shift.status == ShiftStatus.open),
                            1,
                        ),
                        else_=0,
                    )
                ),
            ).select_from(Shift)
        )
    ).one()
    total_shifts_today = _i(shift_row[0])
    open_shifts = _i(shift_row[1])
    open_shifts_today = _i(shift_row[2])

    support_row = (
        await db.execute(
            select(
                func.count(),
                func.sum(case((SupportTicket.unread_for_staff.is_(True), 1), else_=0)),
                func.sum(case((SupportTicket.status == 'new', 1), else_=0)),
                func.sum(case((SupportTicket.status == 'in_progress', 1), else_=0)),
            ).select_from(SupportTicket)
        )
    ).one()
    support_total = _i(support_row[0])
    support_unread = _i(support_row[1])
    support_new = _i(support_row[2])
    support_in_progress = _i(support_row[3])

    market_listing_row = (
        await db.execute(
            select(
                func.sum(case((MarketListing.status == 'pending_review', 1), else_=0)),
                func.sum(case((MarketListing.status == 'published', 1), else_=0)),
            ).select_from(MarketListing)
        )
    ).one()
    listings_pending = _i(market_listing_row[0])
    listings_published = _i(market_listing_row[1])

    orders_new = _i(
        await db.scalar(
            select(func.count())
            .select_from(MarketOrder)
            .where(MarketOrder.status == 'new')
        )
    )

    hierarchy_row = (
        await db.execute(
            select(
                func.count(),
                func.count(func.distinct(OrgHierarchyLink.head_org_id)),
            ).select_from(OrgHierarchyLink)
        )
    ).one()
    hierarchy_links = _i(hierarchy_row[0])
    hierarchy_heads = _i(hierarchy_row[1])

    attention = _build_attention(
        inactive_orgs=inactive_orgs,
        trials_expiring_soon=trials_expiring_soon,
        trials_expired_active=trials_expired_active,
        support_unread=support_unread,
        listings_pending=listings_pending,
        orders_new=orders_new,
    )

    return SuperAdminStatsResponse(
        total_orgs=total_orgs,
        active_orgs=active_orgs,
        trial_orgs=trial_orgs,
        total_employees=total_employees,
        total_shifts_today=total_shifts_today,
        inactive_orgs=inactive_orgs,
        basic_orgs=basic_orgs,
        pro_orgs=pro_orgs,
        active_employees=active_employees,
        open_shifts=open_shifts,
        open_shifts_today=open_shifts_today,
        support_total=support_total,
        support_unread=support_unread,
        support_new=support_new,
        support_in_progress=support_in_progress,
        marketplace_orgs=marketplace_orgs,
        listings_pending_review=listings_pending,
        listings_published=listings_published,
        orders_new=orders_new,
        hierarchy_links=hierarchy_links,
        hierarchy_heads=hierarchy_heads,
        trials_expiring_soon=trials_expiring_soon,
        trials_expired_active=trials_expired_active,
        attention=attention,
    )


def _build_attention(
    *,
    inactive_orgs: int,
    trials_expiring_soon: int,
    trials_expired_active: int,
    support_unread: int,
    listings_pending: int,
    orders_new: int,
) -> list[SuperAdminAttentionItem]:
    items: list[SuperAdminAttentionItem] = []
    if support_unread > 0:
        items.append(
            SuperAdminAttentionItem(
                code='support_unread',
                severity='warning',
                count=support_unread,
                message=f'{support_unread} непрочитанных обращений в поддержку',
            )
        )
    if listings_pending > 0:
        items.append(
            SuperAdminAttentionItem(
                code='listings_pending',
                severity='warning',
                count=listings_pending,
                message=f'{listings_pending} объявлений ждут модерации',
            )
        )
    if orders_new > 0:
        items.append(
            SuperAdminAttentionItem(
                code='orders_new',
                severity='info',
                count=orders_new,
                message=f'{orders_new} новых заказов маркетплейса',
            )
        )
    if trials_expiring_soon > 0:
        items.append(
            SuperAdminAttentionItem(
                code='trials_expiring',
                severity='warning',
                count=trials_expiring_soon,
                message=f'{trials_expiring_soon} trial истекают в ближайшие 7 дней',
            )
        )
    if trials_expired_active > 0:
        items.append(
            SuperAdminAttentionItem(
                code='trials_expired',
                severity='warning',
                count=trials_expired_active,
                message=f'{trials_expired_active} активных org с просроченным trial',
            )
        )
    if inactive_orgs > 0:
        items.append(
            SuperAdminAttentionItem(
                code='inactive_orgs',
                severity='info',
                count=inactive_orgs,
                message=f'{inactive_orgs} неактивных организаций',
            )
        )
    return items
