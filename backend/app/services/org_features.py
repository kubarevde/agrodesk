"""Organization feature flags stored in Organization.settings (JSONB)."""

from __future__ import annotations

from typing import Any

# Documented key in Organization.settings:
#   "shipment_requests_enabled": true | false
# Absent key → enabled (backward compatible with orgs already using the module).
SHIPMENT_REQUESTS_ENABLED_KEY = 'shipment_requests_enabled'

# Marketplace vitrine: absent / false → org listings must not appear publicly.
MARKETPLACE_ENABLED_KEY = 'marketplace_enabled'

SHIPMENT_REQUEST_ACTIONS = frozenset(
    {
        'shipment_requests.manage',
        'shipment_requests.execute',
    }
)

MARKETPLACE_MANAGE_ACTIONS = frozenset({'marketplace.manage'})


def settings_dict(raw: Any) -> dict[str, Any]:
    return dict(raw) if isinstance(raw, dict) else {}


def shipment_requests_enabled(settings: Any) -> bool:
    """Return whether shipment-requests module is on for the org."""
    value = settings_dict(settings).get(SHIPMENT_REQUESTS_ENABLED_KEY, True)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() not in {'0', 'false', 'no', 'off'}
    return bool(value)


def marketplace_enabled(settings: Any) -> bool:
    """Return whether marketplace seller/vitrine is enabled for the org (default false)."""
    value = settings_dict(settings).get(MARKETPLACE_ENABLED_KEY, False)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def strip_shipment_request_actions(actions: list[str]) -> list[str]:
    return [a for a in actions if a not in SHIPMENT_REQUEST_ACTIONS]


def strip_marketplace_manage_actions(actions: list[str]) -> list[str]:
    """Hide marketplace.manage when marketplace_enabled is off (default)."""
    return [a for a in actions if a not in MARKETPLACE_MANAGE_ACTIONS]
