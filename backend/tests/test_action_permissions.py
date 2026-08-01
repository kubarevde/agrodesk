"""Unit tests for Level-2 actions and supplier preset (no live API)."""

from app.services.action_permissions import (
    ACTION_KEYS,
    MANAGER_EXTRA_ACTIONS,
    SUPPLIER_PRESET_ACTIONS,
    SUPPLIER_PRESET_SECTIONS,
    actions_from_sections,
    employee_has_action,
    normalize_actions,
)
from app.services.permissions import SECTION_KEYS


def test_action_keys_unique_and_labeled():
    assert len(ACTION_KEYS) == len(set(ACTION_KEYS))
    assert 'inventory.operate' in ACTION_KEYS
    assert 'shift.open_own' in ACTION_KEYS


def test_actions_from_sections_employee_inventory():
    actions = actions_from_sections(['my-shift', 'inventory'], 'employee')
    assert 'inventory.operate' in actions
    assert 'inventory.manage_items' not in actions
    assert 'shift.open_own' in actions


def test_actions_from_sections_manager_extras():
    actions = actions_from_sections(['inventory', 'purchase-planner', 'shipments'], 'manager')
    assert 'inventory.operate' in actions
    assert 'inventory.manage_items' in actions
    assert 'purchase.manage' in actions
    assert 'shipment_requests.manage' in actions
    assert 'shipment_requests.execute' in actions
    # Marketplace is opt-in via access groups — not a default manager grant.
    assert 'marketplace.manage' not in actions
    assert 'support.view_org_tickets' not in actions


def test_employee_never_gets_marketplace_manage_from_role_defaults():
    actions = actions_from_sections(
        list(SECTION_KEYS),
        'employee',
    )
    assert 'marketplace.manage' not in actions


def test_marketplace_manage_in_catalog():
    assert 'marketplace.manage' in ACTION_KEYS
    assert 'marketplace.manage' not in MANAGER_EXTRA_ACTIONS

def test_worktime_does_not_imply_others_for_employee():
    actions = actions_from_sections(['my-shift', 'worktime'], 'employee')
    assert 'shift.open_own' in actions
    assert 'shift.close_own' in actions
    assert 'shift.open_for_others' not in actions
    assert 'shift.close_others' not in actions


def test_worktime_manager_gets_others_via_extras():
    actions = actions_from_sections(['worktime'], 'manager')
    assert 'shift.open_for_others' in actions
    assert 'shift.close_others' in actions


def test_supplier_preset_covers_purchases_and_inventory():
    assert 'purchase-planner' in SUPPLIER_PRESET_SECTIONS
    assert 'inventory' in SUPPLIER_PRESET_SECTIONS
    assert 'inventory.operate' in SUPPLIER_PRESET_ACTIONS
    assert 'purchase.create' in SUPPLIER_PRESET_ACTIONS
    for section in SUPPLIER_PRESET_SECTIONS:
        assert section in SECTION_KEYS


def test_normalize_actions_drops_unknown():
    assert normalize_actions(['inventory.operate', 'nope', 'inventory.operate']) == [
        'inventory.operate'
    ]


def test_employee_has_action_admin_bypass():
    assert employee_has_action({'role': 'admin', 'actions': []}, 'inventory.operate')
    assert not employee_has_action(
        {'role': 'employee', 'actions': ['shift.open_own']},
        'inventory.operate',
    )


def test_can_manage_purchases_respects_action():
    from app.services.purchase_planner import can_manage_purchases

    assert can_manage_purchases({'role': 'employee', 'actions': ['purchase.manage']})
    assert not can_manage_purchases({'role': 'employee', 'actions': ['purchase.create']})
    assert can_manage_purchases({'role': 'admin', 'actions': []})
