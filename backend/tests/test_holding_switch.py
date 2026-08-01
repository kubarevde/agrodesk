"""Holding switch / switch-back — auditable single-org JWT drill-in."""

from __future__ import annotations

import asyncio
from uuid import UUID, uuid4

import httpx
import pytest
from jose import jwt
from sqlalchemy import delete, or_, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.audit_log import AuditLog
from app.models.employee import Employee
from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization
from app.services.auth import ALGORITHM
from app.services.holding_switch import (
    CLAIM_ACTING_FROM_HEAD_ORG_ID,
    CLAIM_ACTING_HEAD_EMPLOYEE_ID,
    HOLDING_SHADOW_POSITION,
    shadow_employee_code,
)
from app.services.org_hierarchy import attach_child


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
        name=f'Switch test {suffix}',
        slug=f'sw-{suffix}',
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
    await db.execute(delete(AuditLog).where(AuditLog.org_id.in_(org_ids)))
    await db.execute(
        delete(OrgHierarchyLink).where(
            or_(
                OrgHierarchyLink.head_org_id.in_(org_ids),
                OrgHierarchyLink.child_org_id.in_(org_ids),
            )
        )
    )
    await db.execute(delete(Employee).where(Employee.org_id.in_(org_ids)))
    await db.execute(delete(Organization).where(Organization.id.in_(org_ids)))


def test_shadow_code_length_and_stable() -> None:
    a = uuid4()
    b = uuid4()
    code = shadow_employee_code(a, b)
    assert len(code) <= 20
    assert code.startswith('HOLD-')
    assert shadow_employee_code(a, b) == code


def test_holding_switch_and_back(
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

    child_id = asyncio.run(_with_session(seed))
    try:
        forbidden_plain = client.post(
            '/api/holding/switch',
            headers=admin_headers,
            json={'child_org_id': str(uuid4())},
        )
        assert forbidden_plain.status_code == 403, forbidden_plain.text

        switched = client.post(
            '/api/holding/switch',
            headers=admin_headers,
            json={'child_org_id': child_id},
        )
        assert switched.status_code == 200, switched.text
        body = switched.json()
        assert body['mode'] == 'child'
        assert body['current_org_id'] == child_id
        assert body['head_org_id'] == demo_org_id
        token = body['access_token']
        claims = jwt.get_unverified_claims(token)
        assert claims['org_id'] == child_id
        assert claims[CLAIM_ACTING_FROM_HEAD_ORG_ID] == demo_org_id
        assert CLAIM_ACTING_HEAD_EMPLOYEE_ID in claims
        assert 'telegram_id' not in claims

        child_headers = {'Authorization': f'Bearer {token}'}
        # Child-scoped dashboard works
        dash = client.get('/api/dashboard/stats', headers=child_headers)
        assert dash.status_code == 200, dash.text

        # Nested switch blocked
        nested = client.post(
            '/api/holding/switch',
            headers=child_headers,
            json={'child_org_id': child_id},
        )
        assert nested.status_code in (400, 403), nested.text

        # Shadow exists
        async def check_shadow(db: AsyncSession) -> None:
            code = shadow_employee_code(head_id, UUID(child_id))
            emp = (
                await db.execute(select(Employee).where(Employee.employee_code == code))
            ).scalar_one()
            assert emp.org_id == UUID(child_id)
            assert emp.position == HOLDING_SHADOW_POSITION
            assert emp.telegram_id is None
            assert emp.role.value == 'admin'

            audits = (
                await db.execute(
                    select(AuditLog).where(
                        AuditLog.org_id.in_([head_id, UUID(child_id)]),
                        AuditLog.action == 'holding.switch',
                    )
                )
            ).scalars().all()
            assert len(audits) >= 2

        asyncio.run(_with_session(check_shadow))

        back = client.post('/api/holding/switch-back', headers=child_headers)
        assert back.status_code == 200, back.text
        back_body = back.json()
        assert back_body['mode'] == 'head'
        assert back_body['current_org_id'] == demo_org_id
        back_claims = jwt.get_unverified_claims(back_body['access_token'])
        assert back_claims['org_id'] == demo_org_id
        assert CLAIM_ACTING_FROM_HEAD_ORG_ID not in back_claims

        head_headers = {'Authorization': f"Bearer {back_body['access_token']}"}
        # Ordinary login path still works independently
        login = client.post(
            '/api/auth/login',
            json={'email': 'EMP000', 'password': '1234', 'org_id': demo_org_id},
        )
        assert login.status_code == 200, login.text

        # switch-back without acting claims fails
        bad_back = client.post('/api/holding/switch-back', headers=head_headers)
        assert bad_back.status_code == 400, bad_back.text
    finally:
        asyncio.run(_with_session(cleanup))


def test_manager_without_switch_forbidden(
    client: httpx.Client,
    manager_headers: dict[str, str],
) -> None:
    r = client.post(
        '/api/holding/switch',
        headers=manager_headers,
        json={'child_org_id': str(uuid4())},
    )
    assert r.status_code == 403, r.text
