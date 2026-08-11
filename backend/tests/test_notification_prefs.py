"""Unit tests for per-type notification preferences."""

from __future__ import annotations

from app.services.notification_prefs import (
    NOTIFICATION_TYPE_KEYS,
    catalog_with_state,
    is_type_enabled,
    merge_prefs_update,
)


def test_known_types_cover_product_events() -> None:
    required = {
        'to_due',
        'to_overdue',
        'maintenance_done',
        'sharing_request',
        'sharing_accepted',
        'sharing_rejected',
        'new_message',
        'support_reply',
        'new_market_order',
        'marketplace_moderation',
    }
    assert required <= NOTIFICATION_TYPE_KEYS


def test_absent_pref_defaults_to_enabled() -> None:
    assert is_type_enabled({}, 'to_due') is True
    assert is_type_enabled({'to_due': False}, 'to_due') is False
    assert is_type_enabled({'to_due': False}, 'to_overdue') is True


def test_merge_and_catalog() -> None:
    merged = merge_prefs_update({}, {'to_due': False, 'unknown': False})
    assert merged == {'to_due': False}
    catalog = catalog_with_state(merged)
    by_type = {row['type']: row['enabled'] for row in catalog}
    assert by_type['to_due'] is False
    assert by_type['new_message'] is True
