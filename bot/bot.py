import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from app.config import settings
from app.handlers import start, work_start, work_end, status, admin
from app.services.api_client import ApiClient
from app.services.sheets import SheetsClient
from app.services.dual_writer import DualWriter

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
)


async def main():
    bot = Bot(token=settings.bot_token)
    dp = Dispatcher(storage=MemoryStorage())

    api_client = ApiClient()

    sheets_client = None
    if settings.sheets_mirror_enabled:
        try:
            sheets_client = SheetsClient.from_service_account()
            logging.info('Google Sheets mirror: ENABLED')
        except Exception as e:
            logging.warning(f'Google Sheets mirror: DISABLED ({e})')

    dual = DualWriter(api_client, sheets_client)

    dp['api'] = api_client
    dp['sheets'] = sheets_client
    dp['dual'] = dual

    dp.include_router(start.router)
    dp.include_router(work_start.router)
    dp.include_router(work_end.router)
    dp.include_router(status.router)
    dp.include_router(admin.router)

    logging.info('AgroDesk Bot started. Polling...')
    await dp.start_polling(bot)


if __name__ == '__main__':
    asyncio.run(main())
