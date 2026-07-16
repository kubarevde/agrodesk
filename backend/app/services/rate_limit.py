"""In-memory rate limit helpers for sensitive auth endpoints (bot-token)."""

from __future__ import annotations

import time
from collections import defaultdict, deque


class SlidingWindowLimiter:
    """Simple process-local sliding window. Not shared across workers."""

    def __init__(self, *, max_hits: int, window_seconds: float) -> None:
        self.max_hits = max_hits
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        bucket = self._hits[key]
        cutoff = now - self.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.popleft()
        if len(bucket) >= self.max_hits:
            return False
        bucket.append(now)
        return True


# Protect bot-token from brute-force of secret / telegram_id enumeration
bot_token_limiter = SlidingWindowLimiter(max_hits=30, window_seconds=60.0)
