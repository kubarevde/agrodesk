"""Sharing: platform-wide catalog visibility and soft archive."""

from __future__ import annotations

import inspect
from types import SimpleNamespace
from uuid import uuid4

from app.routers.sharing import can_view_listing, is_owner_or_admin
from app.schemas.sharing import SharingListingStatusUpdate


def test_status_update_allows_archived() -> None:
    payload = SharingListingStatusUpdate(status='archived')
    assert payload.status == 'archived'


def test_sharing_create_types_are_three_only() -> None:
    from app.schemas.sharing import SharingListingCreate

    fields = SharingListingCreate.model_fields['type'].annotation
    assert 'parts' not in str(fields)
    assert set(getattr(fields, '__args__', ())) == {'field', 'equipment', 'implement'}


def test_delete_listing_sets_archived_not_hard_delete() -> None:
    from app.routers import sharing as sharing_router

    source = inspect.getsource(sharing_router.delete_listing)
    assert "listing.status = 'archived'" in source
    assert 'db.delete' not in source
    assert 'await db.delete' not in source


def test_list_listings_is_platform_wide() -> None:
    from app.routers import sharing as sharing_router

    source = inspect.getsource(sharing_router.list_listings)
    assert 'SharingListing.org_id == current.org_id' not in source
    assert 'Platform-wide' in source or 'platform-wide' in source.lower()


def test_create_request_allows_cross_org() -> None:
    from app.routers import sharing as sharing_router

    source = inspect.getsource(sharing_router.create_request)
    assert 'listing.org_id != current.org_id' not in source


def test_can_view_active_listing_from_any_org() -> None:
    listing = SimpleNamespace(status='active', org_id=uuid4(), owner_id=uuid4())
    viewer = SimpleNamespace(id=uuid4(), org_id=uuid4(), role='manager')
    assert can_view_listing(listing, viewer) is True


def test_can_view_archived_only_for_owning_org() -> None:
    org_id = uuid4()
    owner_id = uuid4()
    listing = SimpleNamespace(status='archived', org_id=org_id, owner_id=owner_id)
    owner = SimpleNamespace(id=owner_id, org_id=org_id, role='manager')
    stranger = SimpleNamespace(id=uuid4(), org_id=uuid4(), role='manager')
    assert can_view_listing(listing, owner) is True
    assert can_view_listing(listing, stranger) is False


def test_is_owner_or_admin_requires_same_org_for_admin() -> None:
    org_id = uuid4()
    listing = SimpleNamespace(owner_id=uuid4(), org_id=org_id)
    foreign_admin = SimpleNamespace(id=uuid4(), org_id=uuid4(), role='admin')
    local_admin = SimpleNamespace(id=uuid4(), org_id=org_id, role='admin')
    # EmployeeRole.admin comparison uses enum in production; string works if role compared to enum —
    # use the real enum for this assertion.
    from app.models.employee import EmployeeRole

    foreign_admin.role = EmployeeRole.admin
    local_admin.role = EmployeeRole.admin
    assert is_owner_or_admin(listing, foreign_admin) is False
    assert is_owner_or_admin(listing, local_admin) is True
