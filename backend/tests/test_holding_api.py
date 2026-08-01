"""Holding endpoints: separate from dashboard; require holding.view + head link."""

from __future__ import annotations

import ast
import asyncio
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import delete, or_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization
from app.services.org_hierarchy import attach_child

BACKEND_APP = Path(__file__).resolve().parents[1] / 'app'


async def _with_session(coro_factory):
    engine = create_async_engine(settings.DATABASE_URL)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with session_factory() as db:
            result = await coro_factory(db)
            await db.commit()
            return result
    finally:
        await engine.dispose()


async def _make_org(db: AsyncSession, *, suffix: str) -> Organization:
    org = Organization(
        id=uuid4(),
        name=f'Holding test {suffix}',
        slug=f'hold-{suffix}',
        plan='trial',
        is_active=True,
        settings={},
    )
    db.add(org)
    await db.flush()
    return org


async def _cleanup(db: AsyncSession, org_ids: list[UUID]) -> None:
    if not org_ids:
        return
    await db.execute(
        delete(OrgHierarchyLink).where(
            or_(
                OrgHierarchyLink.head_org_id.in_(org_ids),
                OrgHierarchyLink.child_org_id.in_(org_ids),
            )
        )
    )
    await db.execute(delete(Organization).where(Organization.id.in_(org_ids)))


def test_dashboard_and_reports_do_not_import_holding() -> None:
    for rel in (
        'services/dashboard.py',
        'routers/dashboard.py',
        'services/reports.py',
        'routers/reports.py',
        'middleware/org_context.py',
    ):
        tree = ast.parse((BACKEND_APP / rel).read_text(encoding='utf-8'))
        names: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    names.add(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.add(node.module)
        assert not any('holding' in n or 'org_hierarchy' in n for n in names), rel


def test_holding_service_excludes_marketplace_imports() -> None:
    tree = ast.parse((BACKEND_APP / 'services' / 'holding.py').read_text(encoding='utf-8'))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module)
    assert not any('marketplace' in n or 'market_' in n for n in names)


def test_holding_forbidden_for_plain_tenant(
    client: httpx.Client,
    admin_headers: dict[str, str],
) -> None:
    """Demo org without hierarchy links must not get holding overview."""
    children = client.get('/api/holding/children', headers=admin_headers)
    assert children.status_code == 403, children.text
    overview = client.get('/api/dashboard/stats', headers=admin_headers)
    assert overview.status_code == 200, overview.text
    holding = client.get('/api/holding/overview', headers=admin_headers)
    assert holding.status_code == 403, holding.text


def test_holding_manager_without_action_forbidden(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    r = client.get('/api/holding/children', headers=manager_headers)
    assert r.status_code == 403, r.text


def test_holding_children_and_overview_for_head_admin(
    client: httpx.Client,
    demo_org_id: str,
    admin_headers: dict[str, str],
) -> None:
    created: list[UUID] = []
    head_id = UUID(demo_org_id)

    async def seed(db: AsyncSession) -> str:
        child = await _make_org(db, suffix=uuid4().hex[:8])
        created.append(child.id)
        await attach_child(db, head_org_id=head_id, child_org_id=child.id)
        return str(child.id)

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup(db, created)
        # Also remove links where demo is head (only our child ids).
        await db.execute(
            delete(OrgHierarchyLink).where(
                OrgHierarchyLink.head_org_id == head_id,
                OrgHierarchyLink.child_org_id.in_(created),
            )
        )

    child_id = asyncio.run(_with_session(seed))
    try:
        children = client.get('/api/holding/children', headers=admin_headers)
        assert children.status_code == 200, children.text
        body = children.json()
        assert any(item['org_id'] == child_id for item in body)
        for item in body:
            assert set(item.keys()) == {
                'link_id',
                'org_id',
                'name',
                'slug',
                'is_active',
            }

        overview = client.get('/api/holding/overview', headers=admin_headers)
        assert overview.status_code == 200, overview.text
        data = overview.json()
        assert data['head_org_id'] == demo_org_id
        assert data['totals'] is not None
        child_row = next(c for c in data['children'] if c['org_id'] == child_id)
        allowed_keys = {
            'org_id',
            'name',
            'slug',
            'is_active',
            'employees_count',
            'active_shifts_count',
            'month_shifts_count',
            'month_hours',
            'month_shipments_kg',
            'month_shipments_sum',
            'month_expenses_sum',
            'critical_inventory_count',
            'shipment_requests_active',
        }
        assert set(child_row.keys()) == allowed_keys
        assert 'month_salary_total' not in child_row
        assert 'marketplace' not in data
        assert 'listings' not in str(data)

        # Single-org dashboard still works unchanged
        dash = client.get('/api/dashboard/stats', headers=admin_headers)
        assert dash.status_code == 200, dash.text
    finally:
        asyncio.run(_with_session(cleanup))
