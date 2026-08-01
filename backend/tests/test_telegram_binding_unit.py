"""Unit tests for telegram_binding helpers (no live API)."""

from app.services.telegram_binding import TelegramBindError, TelegramConflict
from uuid import uuid4


def test_bind_error_message_includes_holder():
    err = TelegramBindError(
        [
            TelegramConflict(
                employee_id=uuid4(),
                employee_code='EMP099',
                full_name='Иванов',
                org_id=uuid4(),
            )
        ]
    )
    assert 'Иванов' in err.detail
    assert 'EMP099' in err.detail
    assert 'уже привязан' in err.detail.lower()
