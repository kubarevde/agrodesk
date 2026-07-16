"""Bot settings — only env vars; no backend/DB imports."""

from __future__ import annotations

import logging
import os
import sys

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_DEFAULT_SECRET = 'agrodesk-bot-secret-change-me'
_LOCAL_URL_HINTS = ('localhost', '127.0.0.1', '0.0.0.0', '::1')

# Bothost panel / legacy names → canonical env keys
_ENV_ALIASES: dict[str, str] = {
    'BOTTOKEN': 'BOT_TOKEN',
    'APIBASEURL': 'API_BASE_URL',
    'BOTINTERNALSECRET': 'BOT_INTERNAL_SECRET',
    'LOGLEVEL': 'LOG_LEVEL',
    # Bothost may inject token under these names when creating the bot
    'TELEGRAM_BOT_TOKEN': 'BOT_TOKEN',
    'API_TOKEN': 'BOT_TOKEN',
}

_REQUIRED_ENV = ('BOT_TOKEN', 'API_BASE_URL', 'BOT_INTERNAL_SECRET')

# Case-insensitive fallback (some panels lowercase keys)
_CANONICAL_FROM_LOWER: dict[str, str] = {
    'bot_token': 'BOT_TOKEN',
    'api_base_url': 'API_BASE_URL',
    'bot_internal_secret': 'BOT_INTERNAL_SECRET',
    'bottoken': 'BOT_TOKEN',
    'apibaseurl': 'API_BASE_URL',
    'botinternalsecret': 'BOT_INTERNAL_SECRET',
}


def _normalize_env_aliases() -> None:
    for alias, canonical in _ENV_ALIASES.items():
        alias_val = (os.environ.get(alias) or '').strip()
        canonical_val = (os.environ.get(canonical) or '').strip()
        if alias_val and not canonical_val:
            os.environ[canonical] = alias_val

    for lower_key, canonical in _CANONICAL_FROM_LOWER.items():
        if (os.environ.get(canonical) or '').strip():
            continue
        for key, value in os.environ.items():
            if key.lower() == lower_key and (value or '').strip():
                os.environ[canonical] = value.strip()
                break


def _load_env_files() -> None:
    candidates = (
        '.env',
        'bot.env',
        'bothost.env',
        '/app/.env',
        '/app/bot.env',
        '/app/bothost.env',
    )
    for path in candidates:
        load_dotenv(path, override=False)
    # File on disk should win over empty panel placeholders
    for path in candidates:
        load_dotenv(path, override=True)


def _debug_env_keys() -> str:
    names = sorted(
        k for k in os.environ if any(p in k.upper() for p in ('BOT', 'API', 'SECRET', 'TOKEN', 'URL'))
    )
    return ', '.join(names) if names else '(no BOT/API/TOKEN/SECRET keys in os.environ at all)'


_normalize_env_aliases()
_load_env_files()
_normalize_env_aliases()


def _env_status_line() -> str:
    parts: list[str] = []
    for name in _REQUIRED_ENV:
        parts.append(f'{name}={"set" if (os.environ.get(name) or "").strip() else "MISSING"}')
    return ', '.join(parts)


def _require(name: str) -> str:
    value = (os.environ.get(name) or '').strip()
    if not value:
        missing = [n for n in _REQUIRED_ENV if not (os.environ.get(n) or '').strip()]
        raise RuntimeError(
            f'Missing required env var {name} ({_env_status_line()}).\n'
            f'Detected env keys: {_debug_env_keys()}\n'
            'Fix on bothost.ru (one of):\n'
            '  A) Settings → Переменные окружения → add BOT_INTERNAL_SECRET, then REBUILD bot\n'
            '  B) Add file bothost.env in repo root (private repo!) — see bot/bothost.env.example\n'
            '  C) Run: python scripts/env_debug.py — to see what container actually receives\n'
            'Required:\n'
            '  BOT_TOKEN=...\n'
            '  API_BASE_URL=http://213.183.104.142:3010\n'
            '  BOT_INTERNAL_SECRET=<same as on AgroDesk VPS>'
        )
    return value


def _bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None or raw.strip() == '':
        return default
    return raw.strip().lower() in ('1', 'true', 'yes', 'y', 'on')


def _int(name: str, default: int) -> int:
    raw = (os.environ.get(name) or '').strip()
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError as exc:
        raise RuntimeError(f'{name} must be an integer, got {raw!r}') from exc


def _float(name: str, default: float) -> float:
    raw = (os.environ.get(name) or '').strip()
    if not raw:
        return default
    try:
        return float(raw)
    except ValueError as exc:
        raise RuntimeError(f'{name} must be a number, got {raw!r}') from exc


class Settings:
    bot_token: str
    api_base_url: str
    bot_internal_secret: str
    agrodesk_env: str
    log_level: str
    request_timeout: float
    request_retries: int
    telegram_timeout: float
    polling_timeout: int
    run_mode: str  # polling | webhook (webhook not implemented — use polling on bothost)
    sheets_mirror_enabled: bool
    google_sheets_name: str
    google_creds_path: str
    google_creds_json: str | None

    def __init__(self) -> None:
        self.agrodesk_env = (os.environ.get('AGRODESK_ENV') or 'development').strip().lower()
        self.bot_token = _require('BOT_TOKEN')
        self.api_base_url = _require('API_BASE_URL').rstrip('/')
        self.bot_internal_secret = _require('BOT_INTERNAL_SECRET')
        self.log_level = (os.environ.get('LOG_LEVEL') or 'INFO').upper()
        self.request_timeout = _float('REQUEST_TIMEOUT', 15.0)
        self.request_retries = max(0, _int('REQUEST_RETRIES', 2))
        self.telegram_timeout = _float('TELEGRAM_TIMEOUT', 60.0)
        self.polling_timeout = max(10, _int('POLLING_TIMEOUT', 30))
        self.run_mode = (os.environ.get('BOT_RUN_MODE') or 'polling').strip().lower()

        self.sheets_mirror_enabled = _bool('SHEETS_MIRROR_ENABLED', False)
        self.google_sheets_name = os.environ.get('GOOGLE_SHEETS_NAME', 'worktime_bot')
        self.google_creds_path = os.environ.get(
            'GOOGLE_CREDS_PATH',
            'credentials/service_account.json',
        )
        self.google_creds_json = os.environ.get('GOOGLE_CREDS_JSON') or None

        self._validate()

    @property
    def is_production(self) -> bool:
        return self.agrodesk_env in ('production', 'prod')

    def _validate(self) -> None:
        if self.is_production and self.bot_internal_secret == _DEFAULT_SECRET:
            raise RuntimeError(
                'BOT_INTERNAL_SECRET is the default placeholder. '
                'Set a strong unique secret in bothost env AND on AgroDesk API (AGRODESK_ENV=production).'
            )
        if self.bot_internal_secret == _DEFAULT_SECRET:
            logger.warning(
                'BOT_INTERNAL_SECRET is the default placeholder — '
                'set a strong unique secret on bothost AND on AgroDesk API'
            )
        if any(h in self.api_base_url.lower() for h in _LOCAL_URL_HINTS):
            if self.is_production:
                raise RuntimeError(
                    f'API_BASE_URL looks local ({self.api_base_url}). '
                    'On bothost.ru set the public URL of AgroDesk, e.g. https://your-domain.ru'
                )
            logger.warning(
                'API_BASE_URL looks local (%s). On bothost.ru use the public HTTPS URL '
                'of AgroDesk, e.g. https://your-domain.ru',
                self.api_base_url,
            )
        if self.api_base_url.startswith('http://') and not any(
            h in self.api_base_url.lower() for h in _LOCAL_URL_HINTS
        ):
            logger.warning(
                'API_BASE_URL uses HTTP without TLS (%s). Prefer HTTPS in production.',
                self.api_base_url,
            )
        if self.run_mode not in ('polling', 'webhook'):
            raise RuntimeError(f'BOT_RUN_MODE must be polling or webhook, got {self.run_mode!r}')
        if self.run_mode == 'webhook':
            logger.warning(
                'BOT_RUN_MODE=webhook is not implemented; bothost.ru deployment uses polling'
            )


try:
    settings = Settings()
except RuntimeError as exc:
    print(f'[agrodesk-bot] config error: {exc}', file=sys.stderr)
    raise
