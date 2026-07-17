"""Monthly history aggregation for forecasting (read-only over existing tables)."""

from __future__ import annotations

from calendar import monthrange
from collections import defaultdict
from datetime import date
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agro_plan import AgroPlan
from app.models.equipment_log import EquipmentMaintenance
from app.models.expense import Expense
from app.models.inventory import InventoryItem
from app.models.reference import Equipment, Location
from app.models.shift import Shift
from app.models.shipment import Shipment

# Seed codes from org_dictionaries type=expense_category (see models/dictionary.py).
# Custom org codes are preserved as-is and also appear in by_category.
STANDARD_EXPENSE_CATEGORY_KEYS = ('fuel', 'fertilizer', 'parts', 'salary', 'rent', 'other')
# Back-compat alias used by forecasting / recommendations
CATEGORY_KEYS = STANDARD_EXPENSE_CATEGORY_KEYS


def _num(value: object) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _month_start(d: date) -> date:
    return d.replace(day=1)


def _add_months(d: date, months: int) -> date:
    year = d.year + (d.month - 1 + months) // 12
    month = (d.month - 1 + months) % 12 + 1
    return date(year, month, 1)


def _normalize_category(raw: str | None) -> str:
    """Map expense.category to a stable analytics key.

    Values come from Expense.category (dictionary code expense_category).
    Russian legacy labels are aliased to seed codes; unknown custom codes
    are kept so org-specific categories are not collapsed into «other».
    """
    code = (raw or 'other').strip().lower()
    if not code:
        return 'other'
    aliases = {
        'гсм': 'fuel',
        'топливо': 'fuel',
        'удобрения': 'fertilizer',
        'запчасти': 'parts',
        'зарплата': 'salary',
        'аренда': 'rent',
        'прочее': 'other',
        # Inventory-adjacent codes sometimes used as expense categories
        'seeds': 'seeds',
        'семена': 'seeds',
        'chemicals': 'chemicals',
        'сзр': 'chemicals',
    }
    return aliases.get(code, code)


def empty_categories(extra: set[str] | None = None) -> dict[str, float]:
    keys = set(STANDARD_EXPENSE_CATEGORY_KEYS) | (extra or set())
    return {key: 0.0 for key in sorted(keys)}


def ensure_category_key(buckets: dict[str, dict[str, Any]], cat: str) -> None:
    """Ensure every monthly bucket has the category key (for continuous series)."""
    for bucket in buckets.values():
        by_cat = bucket.setdefault('by_category', {})
        by_cat.setdefault(cat, 0.0)


async def get_monthly_history(
    db: AsyncSession,
    org_id: UUID,
    *,
    months_back: int = 18,
) -> list[dict[str, Any]]:
    """Build a continuous monthly series (no gaps) for forecasting."""
    today = date.today()
    end_month = _month_start(today)
    start_month = _add_months(end_month, -(months_back - 1))
    end_date = date(end_month.year, end_month.month, monthrange(end_month.year, end_month.month)[1])

    expenses = list(
        (
            await db.execute(
                select(Expense).where(
                    Expense.org_id == org_id,
                    Expense.date >= start_month,
                    Expense.date <= end_date,
                )
            )
        ).scalars().all()
    )
    shipments = list(
        (
            await db.execute(
                select(Shipment).where(
                    Shipment.org_id == org_id,
                    Shipment.date >= start_month,
                    Shipment.date <= end_date,
                )
            )
        ).scalars().all()
    )
    shifts = list(
        (
            await db.execute(
                select(Shift).where(
                    Shift.org_id == org_id,
                    Shift.date >= start_month,
                    Shift.date <= end_date,
                )
            )
        ).scalars().all()
    )
    maintenance = list(
        (
            await db.execute(
                select(EquipmentMaintenance)
                .join(Equipment, EquipmentMaintenance.equipment_id == Equipment.id)
                .where(
                    Equipment.org_id == org_id,
                    EquipmentMaintenance.date >= start_month,
                    EquipmentMaintenance.date <= end_date,
                )
            )
        ).scalars().all()
    )
    plans = list(
        (
            await db.execute(
                select(AgroPlan)
                .join(Location, AgroPlan.location_id == Location.id)
                .where(
                    Location.org_id == org_id,
                    AgroPlan.planned_date >= start_month,
                    AgroPlan.planned_date <= end_date,
                )
            )
        ).scalars().all()
    )

    critical_count = (
        await db.execute(
            select(func.count())
            .select_from(InventoryItem)
            .where(
                InventoryItem.org_id == org_id,
                InventoryItem.is_active.is_(True),
                InventoryItem.current_stock < InventoryItem.min_stock,
            )
        )
    ).scalar_one()

    buckets: dict[str, dict[str, Any]] = {}
    cursor = start_month
    while cursor <= end_month:
        key = cursor.isoformat()[:7]
        buckets[key] = {
            'month': key,
            'total_expenses': 0.0,
            'total_income': 0.0,
            'total_margin': 0.0,
            'total_shift_cost': 0.0,
            'total_maintenance_cost': 0.0,
            'urgent_purchase_count': 0,  # purchase_planner not in project — reserved
            'critical_inventory_count': int(critical_count),
            'planned_workload': 0,
            'by_category': empty_categories(),
        }
        cursor = _add_months(cursor, 1)

    for item in expenses:
        key = item.date.isoformat()[:7]
        if key not in buckets:
            continue
        amount = _num(item.amount)
        buckets[key]['total_expenses'] += amount
        cat = _normalize_category(item.category)
        ensure_category_key(buckets, cat)
        buckets[key]['by_category'][cat] += amount

    for item in shipments:
        key = item.date.isoformat()[:7]
        if key not in buckets:
            continue
        income = _num(item.quantity_kg) * _num(item.price_per_kg)
        buckets[key]['total_income'] += income

    for item in shifts:
        key = item.date.isoformat()[:7]
        if key not in buckets:
            continue
        buckets[key]['total_shift_cost'] += _num(item.calculated_amount)

    for item in maintenance:
        key = item.date.isoformat()[:7]
        if key not in buckets:
            continue
        buckets[key]['total_maintenance_cost'] += _num(item.cost)

    for item in plans:
        key = item.planned_date.isoformat()[:7]
        if key not in buckets:
            continue
        buckets[key]['planned_workload'] += 1

    rows = []
    for key in sorted(buckets.keys()):
        row = buckets[key]
        row['total_expenses'] = round(row['total_expenses'], 2)
        row['total_income'] = round(row['total_income'], 2)
        row['total_shift_cost'] = round(row['total_shift_cost'], 2)
        row['total_maintenance_cost'] = round(row['total_maintenance_cost'], 2)
        row['total_margin'] = round(row['total_income'] - row['total_expenses'], 2)
        row['by_category'] = {k: round(v, 2) for k, v in row['by_category'].items()}
        rows.append(row)
    return rows


async def equipment_maintenance_anomalies(
    db: AsyncSession,
    org_id: UUID,
    *,
    months_back: int = 6,
) -> list[dict[str, Any]]:
    """Compare equipment maintenance spend vs median of same type."""
    today = date.today()
    start = _add_months(_month_start(today), -(months_back - 1))
    rows = list(
        (
            await db.execute(
                select(EquipmentMaintenance, Equipment)
                .join(Equipment, EquipmentMaintenance.equipment_id == Equipment.id)
                .where(
                    Equipment.org_id == org_id,
                    EquipmentMaintenance.date >= start,
                )
            )
        ).all()
    )
    by_equipment: dict[UUID, dict[str, Any]] = {}
    by_type: dict[str, list[float]] = defaultdict(list)
    for maint, equip in rows:
        cost = _num(maint.cost)
        if cost <= 0:
            continue
        entry = by_equipment.setdefault(
            equip.id,
            {
                'equipment_id': str(equip.id),
                'equipment_name': equip.name,
                'equipment_type': equip.type or 'other',
                'total_cost': 0.0,
            },
        )
        entry['total_cost'] += cost
    for entry in by_equipment.values():
        by_type[entry['equipment_type']].append(entry['total_cost'])

    anomalies: list[dict[str, Any]] = []
    for entry in by_equipment.values():
        peers = sorted(by_type.get(entry['equipment_type'], []))
        if len(peers) < 2:
            continue
        mid = peers[len(peers) // 2]
        if mid <= 0:
            continue
        ratio = entry['total_cost'] / mid
        if ratio >= 1.5:
            anomalies.append({**entry, 'median_peer_cost': round(mid, 2), 'ratio': round(ratio, 2)})
    return anomalies
