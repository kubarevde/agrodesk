"""Ensure Settings() can load before importing bot app modules."""

from __future__ import annotations

import os

os.environ.setdefault('BOT_TOKEN', '0000000000:TESTTOKEN_FOR_UNIT_TESTS')
os.environ.setdefault('API_BASE_URL', 'http://api.test')
os.environ.setdefault('BOT_INTERNAL_SECRET', 'test-bot-secret')
os.environ.setdefault('AGRODESK_ENV', 'development')
os.environ.setdefault('REQUEST_RETRIES', '0')
os.environ.setdefault('REQUEST_TIMEOUT', '5')
