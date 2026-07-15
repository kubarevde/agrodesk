import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

from app.config import settings


def setup_logging() -> None:
    """Configure root logger: console + rotating file under logs/app.log."""
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    log_dir = Path('logs')
    log_dir.mkdir(exist_ok=True)

    root = logging.getLogger()
    root.setLevel(level)

    formatter = logging.Formatter(
        '%(asctime)s %(levelname)s [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S',
    )

    # Avoid duplicate handlers on reload
    if any(isinstance(h, RotatingFileHandler) for h in root.handlers):
        return

    console = logging.StreamHandler()
    console.setLevel(level)
    console.setFormatter(formatter)
    root.addHandler(console)

    file_handler = RotatingFileHandler(
        log_dir / 'app.log',
        maxBytes=5 * 1024 * 1024,
        backupCount=5,
        encoding='utf-8',
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)
