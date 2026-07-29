"""In-process TTL cache for weather responses (per lat/lon/date window)."""

from __future__ import annotations

import time
from threading import Lock
from typing import Any


class TtlCache:
    def __init__(self, ttl_seconds: int | None = None) -> None:
        if ttl_seconds is None:
            try:
                from app.config import settings

                ttl_seconds = int(settings.WEATHER_CACHE_TTL_SECONDS)
            except Exception:  # noqa: BLE001 — fallback when settings unavailable in unit tests
                ttl_seconds = 2700
        self.ttl_seconds = ttl_seconds
        self._data: dict[str, tuple[float, Any]] = {}
        self._lock = Lock()

    def get(self, key: str) -> Any | None:
        now = time.monotonic()
        with self._lock:
            item = self._data.get(key)
            if item is None:
                return None
            expires_at, value = item
            if now >= expires_at:
                del self._data[key]
                return None
            return value

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = (time.monotonic() + self.ttl_seconds, value)

    def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def __contains__(self, key: str) -> bool:
        return self.get(key) is not None


weather_cache = TtlCache(ttl_seconds=2700)
