"""Role permissions service tests."""

from app.services.permissions import (
    allowed_sections_for_role,
    default_role_permissions,
    normalize_role_permissions,
    role_has_section,
)


def test_default_manager_has_all_sections():
    perms = default_role_permissions()
    allowed = allowed_sections_for_role('manager', perms)
    assert 'maintenance' in allowed
    assert 'purchase-planner' in allowed
    assert 'settings' in allowed


def test_default_employee_limited():
    perms = default_role_permissions()
    allowed = allowed_sections_for_role('employee', perms)
    assert allowed == ['my-shift', 'sharing']


def test_admin_always_full():
    perms = {'manager': ['dashboard'], 'employee': ['my-shift']}
    allowed = allowed_sections_for_role('admin', perms)
    assert 'audit-log' in allowed
    assert 'settings' in allowed


def test_normalize_ignores_unknown_keys():
    raw = {
        'manager': ['dashboard', 'invalid-section', 'equipment'],
        'employee': ['my-shift', 'bogus'],
    }
    normalized = normalize_role_permissions(raw)
    assert 'invalid-section' not in normalized['manager']
    assert 'equipment' in normalized['manager']
    assert normalized['employee'] == ['my-shift']


def test_role_has_section_respects_custom():
    perms = {'manager': ['dashboard'], 'employee': ['sharing']}
    assert role_has_section('manager', 'dashboard', perms)
    assert not role_has_section('manager', 'maintenance', perms)
    # Employee baseline still includes my-shift even if omitted in stored list
    assert role_has_section('employee', 'my-shift', perms)
    assert role_has_section('employee', 'sharing', perms)


def test_employee_can_be_granted_extra_sections():
    perms = {
        'manager': ['dashboard'],
        'employee': ['my-shift', 'sharing', 'fields', 'equipment'],
    }
    allowed = allowed_sections_for_role('employee', perms)
    assert 'fields' in allowed
    assert 'equipment' in allowed
    assert 'reports' not in allowed
    assert role_has_section('employee', 'fields', perms)
    assert not role_has_section('employee', 'reports', perms)


def test_normalize_allows_empty_manager_sections():
    raw = {'manager': [], 'employee': ['my-shift', 'sharing', 'purchase-planner']}
    normalized = normalize_role_permissions(raw)
    assert normalized['manager'] == []
    assert 'purchase-planner' in normalized['employee']


def test_employee_baseline_only_forces_my_shift():
    """Sharing is a default grant, not a locked baseline — admin can revoke it."""
    perms = {
        'manager': ['purchase-planner'],
        'employee': ['purchase-planner'],
    }
    allowed = allowed_sections_for_role('employee', perms)
    assert 'my-shift' in allowed
    assert 'sharing' not in allowed
    assert 'purchase-planner' in allowed


def test_employee_sharing_revocable():
    perms = {'manager': [], 'employee': ['my-shift']}
    allowed = allowed_sections_for_role('employee', perms)
    assert allowed == ['my-shift']
    assert not role_has_section('employee', 'sharing', perms)