"""Seed must create demo fields even when migration 053 left only system locations."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.seed import FIELD_SEED, LOCATIONS, seed_locations, update_field_seed


@pytest.mark.asyncio
async def test_seed_locations_creates_when_only_system_location_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    org_id = '00000000-0000-0000-0000-000000000001'
    added: list[object] = []

    session = MagicMock()
    session.add_all = MagicMock(side_effect=lambda rows: added.extend(rows))
    session.add = MagicMock()
    session.commit = AsyncMock()
    session.scalar = AsyncMock(return_value=0)  # no non-system rows

    update = AsyncMock()
    ensure = AsyncMock()
    monkeypatch.setattr('app.seed.update_field_seed', update)
    monkeypatch.setattr(
        'app.services.field_work_location.ensure_field_work_location',
        ensure,
    )

    await seed_locations(session, org_id)

    assert len(added) == len(LOCATIONS)
    update.assert_awaited_once()
    ensure.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_field_seed_creates_missing_fields(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    org_id = '00000000-0000-0000-0000-000000000001'
    created: list[object] = []

    session = MagicMock()
    session.add = MagicMock(side_effect=lambda row: created.append(row))
    session.commit = AsyncMock()

    empty = MagicMock()
    empty.scalar_one_or_none.return_value = None
    session.execute = AsyncMock(return_value=empty)

    await update_field_seed(session, org_id)

    assert len(created) >= len(FIELD_SEED)
    names = {getattr(row, 'name', None) for row in created}
    assert {row[0] for row in FIELD_SEED}.issubset(names)
