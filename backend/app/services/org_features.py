"""Organization feature flags stored in Organization.settings (JSONB)."""

from __future__ import annotations

from typing import Any

# Legacy key — module is core as of 8.6. Kept for reading old JSONB; always treated as on.
# Historical: "shipment_requests_enabled": true | false (absent → enabled).
SHIPMENT_REQUESTS_ENABLED_KEY = 'shipment_requests_enabled'

# Marketplace vitrine: absent / false → org listings must not appear publicly.
MARKETPLACE_ENABLED_KEY = 'marketplace_enabled'

# Show payroll money amounts to employees (me/earnings). Absent → True (default on).
# Writable via org Settings PATCH (employer decision), unlike marketplace_enabled.
PAYROLL_VISIBLE_TO_EMPLOYEES_KEY = 'payroll_visible_to_employees'

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
    """Shipment-requests module is core — always enabled (data + API stay reachable).

    Legacy ``shipment_requests_enabled: false`` in Organization.settings is ignored
    so existing requests never become inaccessible. Flag may still be healed to true
    on settings save.
    """
    del settings  # legacy JSONB ignored
    return True


def marketplace_enabled(settings: Any) -> bool:
    """Return whether marketplace seller/vitrine is enabled for the org (default false)."""
    value = settings_dict(settings).get(MARKETPLACE_ENABLED_KEY, False)
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def _coerce_bool(value: Any, *, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {'1', 'true', 'yes', 'on'}
    return bool(value)


def payroll_visible_to_employees(settings: Any) -> bool:
    """Whether employees may see monetary earnings (default True when key absent)."""
    raw = settings_dict(settings)
    if PAYROLL_VISIBLE_TO_EMPLOYEES_KEY not in raw:
        return True
    return _coerce_bool(raw.get(PAYROLL_VISIBLE_TO_EMPLOYEES_KEY), default=True)


def strip_shipment_request_actions(actions: list[str]) -> list[str]:
    """No-op: shipment request actions are never stripped (module is core)."""
    return list(actions)


def strip_marketplace_manage_actions(actions: list[str]) -> list[str]:
    """Hide marketplace.manage when marketplace_enabled is off (default)."""
    return [a for a in actions if a not in MARKETPLACE_MANAGE_ACTIONS]
