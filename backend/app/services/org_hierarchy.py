"""Service layer for org_hierarchy_links (head → child).

Tenant APIs stay single-org. This module only manages additive links;
holding overview / switch live in later phases.
"""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.org_hierarchy import OrgHierarchyLink
from app.models.organization import Organization


class OrgHierarchyError(Exception):
    """Domain error for attach/detach; map to HTTP in the router."""

    def __init__(self, detail: str, *, status_code: int = 400) -> None:
        super().__init__(detail)
        self.detail = detail
        self.status_code = status_code


@dataclass(frozen=True)
class OrgHierarchyLinkView:
    id: UUID
    head_org_id: UUID
    child_org_id: UUID
    child_name: str
    child_slug: str
    child_is_active: bool


@dataclass(frozen=True)
class OrgHierarchyCandidate:
    id: UUID
    name: str
    slug: str


async def _get_org(db: AsyncSession, org_id: UUID) -> Organization | None:
    return await db.get(Organization, org_id)


async def get_link_by_child(
    db: AsyncSession,
    child_org_id: UUID,
) -> OrgHierarchyLink | None:
    result = await db.execute(
        select(OrgHierarchyLink).where(OrgHierarchyLink.child_org_id == child_org_id)
    )
    return result.scalar_one_or_none()


@dataclass(frozen=True)
class OrgHierarchyParentView:
    link_id: UUID
    head_org_id: UUID
    head_name: str
    head_slug: str
    head_is_active: bool


async def get_parent_for_child(
    db: AsyncSession,
    child_org_id: UUID,
) -> OrgHierarchyParentView | None:
    """Return head org if child is linked; None if standalone or head-only."""
    link = await get_link_by_child(db, child_org_id)
    if link is None:
        return None
    head = await _get_org(db, link.head_org_id)
    if head is None:
        return None
    return OrgHierarchyParentView(
        link_id=link.id,
        head_org_id=head.id,
        head_name=head.name,
        head_slug=head.slug,
        head_is_active=bool(head.is_active),
    )


async def _ancestor_ids(db: AsyncSession, org_id: UUID) -> set[UUID]:
    """Walk parent links upward from org_id (forest: each node ≤1 parent)."""
    ancestors: set[UUID] = set()
    current = org_id
    while True:
        link = await get_link_by_child(db, current)
        if link is None:
            break
        parent_id = link.head_org_id
        if parent_id in ancestors:
            # Corrupt / cyclic data — stop to avoid infinite loop.
            break
        ancestors.add(parent_id)
        current = parent_id
    return ancestors


async def would_create_cycle(
    db: AsyncSession,
    *,
    head_org_id: UUID,
    child_org_id: UUID,
) -> bool:
    """True if making head→child would close a loop (child is ancestor of head)."""
    if head_org_id == child_org_id:
        return True
    return child_org_id in await _ancestor_ids(db, head_org_id)


async def list_children_for_head(
    db: AsyncSession,
    head_org_id: UUID,
) -> list[OrgHierarchyLinkView]:
    """Return linked children for head. Empty list if head has no links."""
    result = await db.execute(
        select(OrgHierarchyLink, Organization)
        .join(Organization, Organization.id == OrgHierarchyLink.child_org_id)
        .where(OrgHierarchyLink.head_org_id == head_org_id)
        .order_by(Organization.name.asc())
    )
    rows = result.all()
    return [
        OrgHierarchyLinkView(
            id=link.id,
            head_org_id=link.head_org_id,
            child_org_id=link.child_org_id,
            child_name=child.name,
            child_slug=child.slug,
            child_is_active=bool(child.is_active),
        )
        for link, child in rows
    ]


async def list_attach_candidates(
    db: AsyncSession,
    head_org_id: UUID,
) -> list[OrgHierarchyCandidate]:
    """Active orgs that can be attached as children of head (no link yet, no cycle)."""
    head = await _get_org(db, head_org_id)
    if head is None:
        raise OrgHierarchyError('Головная организация не найдена', status_code=404)

    linked_child_ids = select(OrgHierarchyLink.child_org_id)
    ancestors = await _ancestor_ids(db, head_org_id)
    exclude_ids = {head_org_id, *ancestors}

    query = (
        select(Organization)
        .where(
            Organization.is_active.is_(True),
            Organization.id.notin_(linked_child_ids),
        )
        .order_by(Organization.name.asc())
    )
    if exclude_ids:
        query = query.where(Organization.id.notin_(exclude_ids))

    result = await db.execute(query)
    orgs = result.scalars().all()
    return [OrgHierarchyCandidate(id=o.id, name=o.name, slug=o.slug) for o in orgs]


async def attach_child(
    db: AsyncSession,
    *,
    head_org_id: UUID,
    child_org_id: UUID,
) -> OrgHierarchyLink:
    """Create head→child link. Soft-deleted orgs (is_active=False) cannot be attached."""
    if head_org_id == child_org_id:
        raise OrgHierarchyError(
            'Организация не может быть подчинена самой себе',
            status_code=400,
        )

    head = await _get_org(db, head_org_id)
    if head is None:
        raise OrgHierarchyError('Головная организация не найдена', status_code=404)
    child = await _get_org(db, child_org_id)
    if child is None:
        raise OrgHierarchyError('Дочерняя организация не найдена', status_code=404)

    # Application-level soft-delete: inactive orgs stay in DB but are not linkable.
    if not head.is_active:
        raise OrgHierarchyError(
            'Головная организация неактивна',
            status_code=400,
        )
    if not child.is_active:
        raise OrgHierarchyError(
            'Дочерняя организация неактивна',
            status_code=400,
        )

    if await would_create_cycle(db, head_org_id=head_org_id, child_org_id=child_org_id):
        raise OrgHierarchyError(
            'Привязка создала бы цикл в иерархии организаций',
            status_code=400,
        )

    existing = await get_link_by_child(db, child_org_id)
    if existing is not None:
        if existing.head_org_id == head_org_id:
            return existing
        raise OrgHierarchyError(
            'Организация уже привязана к другой головной',
            status_code=409,
        )

    link = OrgHierarchyLink(head_org_id=head_org_id, child_org_id=child_org_id)
    db.add(link)
    await db.flush()
    return link


async def detach_child(
    db: AsyncSession,
    *,
    head_org_id: UUID,
    child_org_id: UUID,
) -> None:
    """Remove link if it belongs to this head."""
    result = await db.execute(
        select(OrgHierarchyLink).where(
            OrgHierarchyLink.head_org_id == head_org_id,
            OrgHierarchyLink.child_org_id == child_org_id,
        )
    )
    link = result.scalar_one_or_none()
    if link is None:
        raise OrgHierarchyError('Связь не найдена', status_code=404)
    await db.delete(link)
    await db.flush()
