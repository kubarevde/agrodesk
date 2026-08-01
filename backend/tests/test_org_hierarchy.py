"""Invariants for org_hierarchy_links (Phase 1) — no holding/switch/marketplace."""

from __future__ import annotations

import ast
import asyncio
from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import delete, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.employee import Employee
from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization
from app.services.org_hierarchy import (
    OrgHierarchyError,
    attach_child,
    detach_child,
    list_attach_candidates,
    list_children_for_head,
)

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


async def _make_org(db: AsyncSession, *, suffix: str | None = None) -> Organization:
    tag = suffix or uuid4().hex[:8]
    org = Organization(
        id=uuid4(),
        name=f'Hierarchy test {tag}',
        slug=f'hier-{tag}',
        plan='trial',
        is_active=True,
        settings={},
    )
    db.add(org)
    await db.flush()
    return org


async def _cleanup_orgs(db: AsyncSession, org_ids: list[UUID]) -> None:
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
    # API-created orgs have an owner employee — delete before org row.
    await db.execute(delete(Employee).where(Employee.org_id.in_(org_ids)))
    await db.execute(delete(Organization).where(Organization.id.in_(org_ids)))


def test_tenant_dashboard_and_middleware_do_not_import_hierarchy() -> None:
    for rel in (
        'middleware/org_context.py',
        'services/dashboard.py',
        'routers/dashboard.py',
        'routers/reports.py',
        'services/reports.py',
    ):
        tree = ast.parse((BACKEND_APP / rel).read_text(encoding='utf-8'))
        names: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    names.add(alias.name)
            elif isinstance(node, ast.ImportFrom) and node.module:
                names.add(node.module)
        assert not any('org_hierarchy' in n for n in names), rel


def test_attach_detach_invariants() -> None:
    created: list[UUID] = []

    async def scenario(db: AsyncSession) -> None:
        head = await _make_org(db, suffix=f'h{uuid4().hex[:6]}')
        child_a = await _make_org(db, suffix=f'a{uuid4().hex[:6]}')
        child_b = await _make_org(db, suffix=f'b{uuid4().hex[:6]}')
        other_head = await _make_org(db, suffix=f'o{uuid4().hex[:6]}')
        created.extend([head.id, child_a.id, child_b.id, other_head.id])

        # Self-link forbidden
        with pytest.raises(OrgHierarchyError) as self_exc:
            await attach_child(db, head_org_id=head.id, child_org_id=head.id)
        assert self_exc.value.status_code == 400

        link = await attach_child(db, head_org_id=head.id, child_org_id=child_a.id)
        assert link.head_org_id == head.id
        assert link.child_org_id == child_a.id

        # Same attach is idempotent
        again = await attach_child(db, head_org_id=head.id, child_org_id=child_a.id)
        assert again.id == link.id

        # Child cannot belong to two heads
        with pytest.raises(OrgHierarchyError) as dup_exc:
            await attach_child(db, head_org_id=other_head.id, child_org_id=child_a.id)
        assert dup_exc.value.status_code == 409

        await attach_child(db, head_org_id=head.id, child_org_id=child_b.id)
        children = await list_children_for_head(db, head.id)
        assert {c.child_org_id for c in children} == {child_a.id, child_b.id}
        assert await list_children_for_head(db, other_head.id) == []

        await detach_child(db, head_org_id=head.id, child_org_id=child_a.id)
        children_after = await list_children_for_head(db, head.id)
        assert {c.child_org_id for c in children_after} == {child_b.id}

        # Org without links: empty children (other_head never had links)
        assert await list_children_for_head(db, other_head.id) == []

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup_orgs(db, created)

    try:
        asyncio.run(_with_session(scenario))
    finally:
        if created:
            asyncio.run(_with_session(cleanup))


def test_db_unique_and_check_constraints() -> None:
    created: list[UUID] = []

    async def scenario(db: AsyncSession) -> None:
        head = await _make_org(db, suffix=f'c{uuid4().hex[:6]}')
        child = await _make_org(db, suffix=f'd{uuid4().hex[:6]}')
        other = await _make_org(db, suffix=f'e{uuid4().hex[:6]}')
        created.extend([head.id, child.id, other.id])

        db.add(OrgHierarchyLink(head_org_id=head.id, child_org_id=child.id))
        await db.flush()

        db.add(OrgHierarchyLink(head_org_id=other.id, child_org_id=child.id))
        with pytest.raises(IntegrityError):
            await db.flush()
        await db.rollback()

        # Re-load session state after rollback: recreate orgs if needed
        # rollback undoes org inserts too — recreate in same test via outer cleanup ids.
        # Use a fresh attach path after rollback by inserting again.
        head2 = await _make_org(db, suffix=f'f{uuid4().hex[:6]}')
        created.append(head2.id)
        db.add(OrgHierarchyLink(head_org_id=head2.id, child_org_id=head2.id))
        with pytest.raises(IntegrityError):
            await db.flush()
        await db.rollback()

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup_orgs(db, created)

    try:
        asyncio.run(_with_session(scenario))
    finally:
        if created:
            asyncio.run(_with_session(cleanup))


def test_cycle_and_attach_candidates() -> None:
    created: list[UUID] = []

    async def scenario(db: AsyncSession) -> None:
        a = await _make_org(db, suffix=f'cyA{uuid4().hex[:5]}')
        b = await _make_org(db, suffix=f'cyB{uuid4().hex[:5]}')
        c = await _make_org(db, suffix=f'cyC{uuid4().hex[:5]}')
        free = await _make_org(db, suffix=f'cyF{uuid4().hex[:5]}')
        created.extend([a.id, b.id, c.id, free.id])

        await attach_child(db, head_org_id=a.id, child_org_id=b.id)
        await attach_child(db, head_org_id=b.id, child_org_id=c.id)

        # Closing the loop C → A would cycle (A ancestor chain reaches… wait:
        # chain is A→B→C. Attaching A as child of C: head=C, child=A.
        # Ancestors of C include B and A → cycle.
        with pytest.raises(OrgHierarchyError) as cycle_exc:
            await attach_child(db, head_org_id=c.id, child_org_id=a.id)
        assert cycle_exc.value.status_code == 400
        assert 'цикл' in cycle_exc.value.detail.lower()

        candidates = await list_attach_candidates(db, a.id)
        ids = {item.id for item in candidates}
        assert free.id in ids
        assert a.id not in ids
        assert b.id not in ids  # already a child of someone
        assert c.id not in ids  # already a child of someone

        # For C as head, A is ancestor → excluded; free is ok
        candidates_c = await list_attach_candidates(db, c.id)
        ids_c = {item.id for item in candidates_c}
        assert free.id in ids_c
        assert a.id not in ids_c
        assert b.id not in ids_c

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup_orgs(db, created)

    try:
        asyncio.run(_with_session(scenario))
    finally:
        if created:
            asyncio.run(_with_session(cleanup))


def test_inactive_org_cannot_attach() -> None:
    created: list[UUID] = []

    async def scenario(db: AsyncSession) -> None:
        head = await _make_org(db, suffix=f'i{uuid4().hex[:6]}')
        child = await _make_org(db, suffix=f'j{uuid4().hex[:6]}')
        created.extend([head.id, child.id])
        child.is_active = False
        await db.flush()
        with pytest.raises(OrgHierarchyError) as exc:
            await attach_child(db, head_org_id=head.id, child_org_id=child.id)
        assert exc.value.status_code == 400

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup_orgs(db, created)

    try:
        asyncio.run(_with_session(scenario))
    finally:
        if created:
            asyncio.run(_with_session(cleanup))


def test_org_without_links_unaffected_by_hierarchy_table(
    client: httpx.Client,
    demo_org_id: str,
    admin_headers: dict[str, str],
) -> None:
    """Ordinary tenant login + dashboard still work; demo has no required links."""
    async def count_links(db: AsyncSession) -> int:
        result = await db.execute(
            select(OrgHierarchyLink).where(
                (OrgHierarchyLink.head_org_id == UUID(demo_org_id))
                | (OrgHierarchyLink.child_org_id == UUID(demo_org_id))
            )
        )
        return len(result.scalars().all())

    # Demo may or may not have links; API must work either way.
    asyncio.run(_with_session(count_links))

    login = client.post(
        '/api/auth/login',
        json={'email': 'EMP000', 'password': '1234', 'org_id': demo_org_id},
    )
    assert login.status_code == 200, login.text

    dash = client.get('/api/dashboard/stats', headers=admin_headers)
    assert dash.status_code == 200, dash.text


def _superadmin_headers(client: httpx.Client) -> dict[str, str] | None:
    import os

    email = (os.environ.get('SUPERADMIN_EMAIL') or '').strip()
    password = (os.environ.get('SUPERADMIN_PASSWORD') or '').strip()
    if not email or not password:
        return None
    r = client.post(
        '/superadmin/api/auth/login',
        json={'email': email, 'password': password},
    )
    if r.status_code != 200:
        return None
    return {'Authorization': f"Bearer {r.json()['access_token']}"}


def test_superadmin_attach_detach_api(client: httpx.Client) -> None:
    staff = _superadmin_headers(client)
    if staff is None:
        pytest.skip('SUPERADMIN_EMAIL/PASSWORD not configured')

    created: list[UUID] = []

    async def seed(db: AsyncSession) -> tuple[str, str, str]:
        head = await _make_org(db, suffix=f'apih{uuid4().hex[:5]}')
        child = await _make_org(db, suffix=f'apic{uuid4().hex[:5]}')
        other = await _make_org(db, suffix=f'apio{uuid4().hex[:5]}')
        created.extend([head.id, child.id, other.id])
        return str(head.id), str(child.id), str(other.id)

    async def cleanup(db: AsyncSession) -> None:
        await _cleanup_orgs(db, created)

    head_id, child_id, other_id = asyncio.run(_with_session(seed))
    try:
        listed = client.get(f'/superadmin/api/organizations/{head_id}/children', headers=staff)
        assert listed.status_code == 200, listed.text
        assert listed.json() == []

        available = client.get(
            f'/superadmin/api/organizations/{head_id}/children/available',
            headers=staff,
        )
        assert available.status_code == 200, available.text
        available_ids = {item['id'] for item in available.json()}
        assert child_id in available_ids
        assert head_id not in available_ids

        self_link = client.post(
            f'/superadmin/api/organizations/{head_id}/children',
            headers=staff,
            json={'child_org_id': head_id},
        )
        assert self_link.status_code == 400, self_link.text

        attached = client.post(
            f'/superadmin/api/organizations/{head_id}/children',
            headers=staff,
            json={'child_org_id': child_id},
        )
        assert attached.status_code == 201, attached.text
        body = attached.json()
        assert body['child_org_id'] == child_id
        assert body['head_org_id'] == head_id

        available_after = client.get(
            f'/superadmin/api/organizations/{head_id}/children/available',
            headers=staff,
        )
        assert child_id not in {item['id'] for item in available_after.json()}

        conflict = client.post(
            f'/superadmin/api/organizations/{other_id}/children',
            headers=staff,
            json={'child_org_id': child_id},
        )
        assert conflict.status_code == 409, conflict.text

        # Cycle: head→child already; child→head must fail
        cycle = client.post(
            f'/superadmin/api/organizations/{child_id}/children',
            headers=staff,
            json={'child_org_id': head_id},
        )
        assert cycle.status_code == 400, cycle.text
        assert 'цикл' in cycle.json()['detail'].lower()

        # Tenant token must not manage hierarchy
        orgs = client.get('/api/auth/orgs')
        demo = next(o for o in orgs.json() if o.get('slug') in ('demo', 'main') or 'Demo' in (o.get('name') or ''))
        tenant = client.post(
            '/api/auth/login',
            json={'email': 'EMP000', 'password': '1234', 'org_id': demo['id']},
        )
        assert tenant.status_code == 200
        tenant_h = {'Authorization': f"Bearer {tenant.json()['access_token']}"}
        forbidden = client.get(
            f'/superadmin/api/organizations/{head_id}/children',
            headers=tenant_h,
        )
        assert forbidden.status_code in (401, 403), forbidden.text

        # Create/edit org still works; marketplace flag untouched by attach
        create = client.post(
            '/superadmin/api/organizations',
            headers=staff,
            json={
                'name': f'Tmp Hier {uuid4().hex[:6]}',
                'slug': f'tmp-hier-{uuid4().hex[:8]}',
                'owner_email': f'tmp-{uuid4().hex[:6]}@example.com',
                'plan': 'trial',
                'max_employees': 5,
            },
        )
        assert create.status_code == 201, create.text
        tmp_org = create.json()['organization']
        created.append(UUID(tmp_org['id']))
        assert tmp_org.get('marketplace_enabled') is False

        patch = client.patch(
            f'/superadmin/api/organizations/{tmp_org["id"]}',
            headers=staff,
            json={'plan': 'basic', 'max_employees': 8},
        )
        assert patch.status_code == 200, patch.text
        assert patch.json()['plan'] == 'basic'
        assert patch.json().get('marketplace_enabled') is False

        deleted = client.delete(
            f'/superadmin/api/organizations/{head_id}/children/{child_id}',
            headers=staff,
        )
        assert deleted.status_code == 204, deleted.text
        empty = client.get(f'/superadmin/api/organizations/{head_id}/children', headers=staff)
        assert empty.status_code == 200
        assert empty.json() == []

        # Re-attach for parent endpoint check, then cleanup via finally
        reattach = client.post(
            f'/superadmin/api/organizations/{head_id}/children',
            headers=staff,
            json={'child_org_id': child_id},
        )
        assert reattach.status_code == 201, reattach.text
        parent = client.get(
            f'/superadmin/api/organizations/{child_id}/parent',
            headers=staff,
        )
        assert parent.status_code == 200, parent.text
        body = parent.json()
        assert body is not None
        assert body['head_org_id'] == head_id
        assert body['head_name']
        standalone = client.get(
            f'/superadmin/api/organizations/{head_id}/parent',
            headers=staff,
        )
        assert standalone.status_code == 200
        assert standalone.json() is None
    finally:
        asyncio.run(_with_session(cleanup))
