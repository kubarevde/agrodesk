"""Organization tariff plans — codes and documented limits.

DB stores plan as free string with values: trial | basic | pro.
All plans grant the same application modules; marketplace is an independent
Organization.settings flag. Soft differences: recommended max_employees and
optional subscription end date (column trial_ends_at — historical name, any plan).

OPEN QUESTION (no billing): trial_ends_at does not auto-block login/API.
Auth only checks Organization.is_active. Expiry is informational in superadmin
stats until product decides on auto-deactivation.
"""

from __future__ import annotations

from typing import TypedDict


class PlanDefinition(TypedDict):
    code: str
    label_ru: str
    default_max_employees: int
    summary_ru: str


ORG_PLANS: dict[str, PlanDefinition] = {
    'trial': {
        'code': 'trial',
        'label_ru': 'Пробный',
        'default_max_employees': 10,
        'summary_ru': (
            'Полный доступ ко всем модулям. Срок задаётся trial_ends_at; '
            'модули не режутся по плану.'
        ),
    },
    'basic': {
        'code': 'basic',
        'label_ru': 'Базовый',
        'default_max_employees': 25,
        'summary_ru': (
            'Те же модули, что у «Пробного». Коммерческий тариф; '
            'trial_ends_at — срок подписки (необязательно).'
        ),
    },
    'pro': {
        'code': 'pro',
        'label_ru': 'Профессиональный',
        'default_max_employees': 100,
        'summary_ru': (
            'Те же модули, что у «Базового». Рекомендуемый лимит выше. '
            'Marketplace включается отдельно.'
        ),
    },
}


def plan_label_ru(plan: str | None) -> str:
    if not plan:
        return '—'
    definition = ORG_PLANS.get(plan)
    return definition['label_ru'] if definition else plan
