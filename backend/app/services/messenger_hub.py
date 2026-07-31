"""In-process pub/sub hub for messenger SSE realtime.

Additive layer: clients still poll as fallback. Multi-worker deploys may miss
cross-process events; poll covers that gap until a shared broker is added.
"""

from __future__ import annotations

import asyncio
import logging
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


@dataclass
class MessengerHub:
    _queues: dict[tuple[UUID, UUID], set[asyncio.Queue[dict[str, Any]]]] = field(
        default_factory=lambda: defaultdict(set)
    )
    _lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    async def subscribe(self, org_id: UUID, employee_id: UUID) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=100)
        async with self._lock:
            self._queues[(org_id, employee_id)].add(queue)
        return queue

    async def unsubscribe(
        self,
        org_id: UUID,
        employee_id: UUID,
        queue: asyncio.Queue[dict[str, Any]],
    ) -> None:
        async with self._lock:
            key = (org_id, employee_id)
            buckets = self._queues.get(key)
            if not buckets:
                return
            buckets.discard(queue)
            if not buckets:
                self._queues.pop(key, None)

    async def publish(
        self,
        *,
        org_id: UUID,
        employee_ids: list[UUID],
        event: dict[str, Any],
    ) -> int:
        """Fan-out event to active subscriber queues. Returns delivered queue count."""
        delivered = 0
        async with self._lock:
            targets = list(employee_ids)
            for employee_id in targets:
                for queue in list(self._queues.get((org_id, employee_id), ())):
                    try:
                        queue.put_nowait(event)
                        delivered += 1
                    except asyncio.QueueFull:
                        logger.warning(
                            'messenger hub queue full org=%s employee=%s',
                            org_id,
                            employee_id,
                        )
        return delivered


hub = MessengerHub()


def build_event(event_type: str, **payload: Any) -> dict[str, Any]:
    return {'type': event_type, **payload}
