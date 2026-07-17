"""Explainable rule-based optimization recommendations (no AI)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.analytics_history import (
    STANDARD_EXPENSE_CATEGORY_KEYS,
    equipment_maintenance_anomalies,
    get_monthly_history,
)


def _growth(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    first = values[0]
    last = values[-1]
    if abs(first) < 1e-9:
        return None if last == 0 else 1.0
    return (last - first) / abs(first)


async def build_recommendations(db: AsyncSession, org_id: UUID) -> list[dict[str, Any]]:
    history = await get_monthly_history(db, org_id, months_back=12)
    if len(history) < 3:
        return [
            {
                'title': 'Недостаточно данных для рекомендаций',
                'explanation': 'Нужно минимум 3 месяца затрат и отгрузок.',
                'level': 'info',
                'why_numbers': {'months': len(history)},
                'suggested_action': 'Продолжайте фиксировать расходы и отгрузки.',
                'related_entity_type': None,
                'related_entity_id': None,
            }
        ]

    recs: list[dict[str, Any]] = []
    last3 = history[-3:]
    total_growths = [_growth([row['total_expenses'] for row in last3])]
    avg_expense_growth = next((g for g in total_growths if g is not None), 0.0) or 0.0

    # Category growth vs overall — use categories present in history
    category_keys: set[str] = set(STANDARD_EXPENSE_CATEGORY_KEYS)
    for row in history:
        category_keys.update((row.get('by_category') or {}).keys())

    for cat in sorted(category_keys):
        series = [float((row['by_category'] or {}).get(cat) or 0.0) for row in last3]
        g = _growth(series)
        if g is None:
            continue
        if g > max(0.2, avg_expense_growth * 1.5) and series[-1] > 0:
            recs.append(
                {
                    'title': f'Категория «{cat}» растёт быстрее остальных',
                    'explanation': (
                        f'За 3 месяца рост {g * 100:.0f}% при среднем росте затрат '
                        f'{avg_expense_growth * 100:.0f}%.'
                    ),
                    'level': 'warning' if g < 0.8 else 'critical',
                    'why_numbers': {
                        'category': cat,
                        'growth_pct': round(g * 100, 1),
                        'avg_expense_growth_pct': round(avg_expense_growth * 100, 1),
                        'last_month_amount': series[-1],
                    },
                    'suggested_action': 'Проверьте закупки и нормы расхода по этой категории.',
                    'related_entity_type': 'expense_category',
                    'related_entity_id': cat,
                }
            )

    # Category share spike
    for cat in sorted(category_keys):
        shares = []
        for row in history[-6:]:
            total = float(row['total_expenses'] or 0.0)
            amount = float((row['by_category'] or {}).get(cat) or 0.0)
            shares.append(amount / total if total > 0 else 0.0)
        if len(shares) < 4:
            continue
        hist_avg = sum(shares[:-1]) / max(1, len(shares) - 1)
        last = shares[-1]
        if hist_avg > 0 and last > hist_avg * 1.4 and last > 0.15:
            recs.append(
                {
                    'title': f'Доля «{cat}» выше исторической нормы',
                    'explanation': (
                        f'Обычно ~{hist_avg * 100:.0f}% затрат, сейчас {last * 100:.0f}%.'
                    ),
                    'level': 'warning',
                    'why_numbers': {
                        'category': cat,
                        'historical_share_pct': round(hist_avg * 100, 1),
                        'current_share_pct': round(last * 100, 1),
                    },
                    'suggested_action': 'Сверьте счета и лимиты по категории.',
                    'related_entity_type': 'expense_category',
                    'related_entity_id': cat,
                }
            )

    # Margin decline
    margins = [float(row['total_margin'] or 0.0) for row in history[-4:]]
    if len(margins) >= 3 and margins[-1] < margins[-2] < margins[-3]:
        recs.append(
            {
                'title': 'Маржа снижается несколько периодов подряд',
                'explanation': 'Доходы минус затраты падают три месяца подряд.',
                'level': 'critical',
                'why_numbers': {'margins': [round(m, 2) for m in margins[-3:]]},
                'suggested_action': 'Пересмотрите цены отгрузок и крупные статьи затрат.',
                'related_entity_type': 'finance',
                'related_entity_id': None,
            }
        )

    # Critical inventory risk
    last = history[-1]
    if int(last.get('critical_inventory_count') or 0) > 0:
        level = 'warning'
        if int(last.get('planned_workload') or 0) > 0 or float(last.get('total_maintenance_cost') or 0) > 0:
            level = 'critical'
        recs.append(
            {
                'title': 'Критичные остатки ТМЦ повышают риск аварийных затрат',
                'explanation': (
                    'Есть позиции ниже минимума; при работах/ТО возможны срочные закупки.'
                ),
                'level': level,
                'why_numbers': {
                    'critical_inventory_count': last.get('critical_inventory_count'),
                    'planned_workload': last.get('planned_workload'),
                    'total_maintenance_cost': last.get('total_maintenance_cost'),
                },
                'suggested_action': 'Пополните критичные позиции до сезонной нагрузки.',
                'related_entity_type': 'inventory_item',
                'related_entity_id': None,
            }
        )

    # Equipment maintenance anomalies
    anomalies = await equipment_maintenance_anomalies(db, org_id, months_back=6)
    for item in anomalies[:5]:
        recs.append(
            {
                'title': f'ТО «{item["equipment_name"]}» дороже медианы по типу',
                'explanation': (
                    f'Затраты на ТО в {item["ratio"]}× выше медианы техники типа '
                    f'«{item["equipment_type"]}».'
                ),
                'level': 'warning' if item['ratio'] < 2 else 'critical',
                'why_numbers': {
                    'total_cost': round(item['total_cost'], 2),
                    'median_peer_cost': item['median_peer_cost'],
                    'ratio': item['ratio'],
                },
                'suggested_action': 'Проверьте регламент ТО и расход запчастей по единице.',
                'related_entity_type': 'equipment',
                'related_entity_id': item['equipment_id'],
            }
        )

    # Rising maintenance overall
    maint = [float(row['total_maintenance_cost'] or 0.0) for row in last3]
    mg = _growth(maint)
    if mg is not None and mg > 0.4 and maint[-1] > 0:
        recs.append(
            {
                'title': 'Растут затраты на ТО техники',
                'explanation': f'За 3 месяца рост ремонтных затрат {mg * 100:.0f}%.',
                'level': 'warning',
                'why_numbers': {'growth_pct': round(mg * 100, 1), 'last_month': maint[-1]},
                'suggested_action': 'Спланируйте профилактику до пика сезона.',
                'related_entity_type': 'equipment_maintenance',
                'related_entity_id': None,
            }
        )

    order = {'critical': 0, 'warning': 1, 'info': 2}
    recs.sort(key=lambda r: order.get(str(r.get('level')), 9))
    return recs
