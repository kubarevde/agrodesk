"""Marketplace must not leak into core farm accounting / KPI / default roles."""

from __future__ import annotations

import ast
import asyncio
from pathlib import Path
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.organization import Organization
from app.services.action_permissions import (
    MANAGER_EXTRA_ACTIONS,
    actions_from_sections,
)
from app.services.org_features import (
    MARKETPLACE_ENABLED_KEY,
    marketplace_enabled,
    strip_marketplace_manage_actions,
)
from app.services.permissions import SECTION_KEYS
from tests.test_marketplace_public import _seed_listings, _with_session

BACKEND_APP = Path(__file__).resolve().parents[1] / 'app'


def _imported_module_names(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding='utf-8'))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    return names


def test_reports_service_does_not_import_marketplace() -> None:
    names = _imported_module_names(BACKEND_APP / 'services' / 'reports.py')
    assert not any('marketplace' in n or 'market_order' in n for n in names)


def test_dashboard_service_does_not_import_marketplace() -> None:
    names = _imported_module_names(BACKEND_APP / 'services' / 'dashboard.py')
    assert not any('marketplace' in n or 'market_order' in n for n in names)


def test_marketplace_manage_not_default_for_employee_or_manager() -> None:
    for role in ('employee', 'manager'):
        actions = actions_from_sections(list(SECTION_KEYS), role)
        assert 'marketplace.manage' not in actions
    assert 'marketplace.manage' not in MANAGER_EXTRA_ACTIONS


def test_strip_marketplace_when_flag_off() -> None:
    assert strip_marketplace_manage_actions(
        ['inventory.operate', 'marketplace.manage', 'purchase.create']
    ) == ['inventory.operate', 'purchase.create']
    assert marketplace_enabled({}) is False
    assert marketplace_enabled({MARKETPLACE_ENABLED_KEY: True}) is True


async def _set_org_active(db: AsyncSession, org_id: UUID, active: bool) -> None:
    org = await db.get(Organization, org_id)
    assert org is not None
    org.is_active = active


def test_inactive_org_listings_hidden_from_vitrine(
    client: httpx.Client,
    demo_org_id: str,
) -> None:
    """Superadmin soft-delete (is_active=False) must hide public listings."""
    seeded = asyncio.run(_with_session(lambda db: _seed_listings(db, UUID(demo_org_id))))
    listing_id = seeded['published_id']

    try:
        asyncio.run(
            _with_session(lambda db: _set_org_active(db, UUID(demo_org_id), False))
        )
        response = client.get(f'/api/public/marketplace/listings/{listing_id}')
        assert response.status_code == 404, response.text
        catalog = client.get('/api/public/marketplace/listings')
        assert catalog.status_code == 200, catalog.text
        ids = {item['id'] for item in catalog.json()['items']}
        assert listing_id not in ids
    finally:
        asyncio.run(
            _with_session(lambda db: _set_org_active(db, UUID(demo_org_id), True))
        )


def test_settings_marketplace_not_writable_on_org_update_schema() -> None:
    """Org PATCH model has no marketplace_enabled — enablement is platform-side only."""
    from app.routers.settings import OrgSettingsResponse, OrgSettingsUpdate

    assert 'marketplace_enabled' in OrgSettingsResponse.model_fields
    assert 'marketplace_enabled' not in OrgSettingsUpdate.model_fields
    # Extra field must not be accepted as a writable update field.
    updated = OrgSettingsUpdate.model_validate({'marketplace_enabled': True, 'timezone': 'UTC'})
    assert updated.model_dump(exclude_unset=True) == {'timezone': 'UTC'}
