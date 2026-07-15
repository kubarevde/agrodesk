from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import Message

from app.services.api_client import ApiClient
from app.utils.menu import menu_for_user

router = Router()


@router.message(CommandStart())
async def start(message: Message, api: ApiClient):
    employee = await api.get_employee(message.from_user.id)
    if not employee:
        await message.answer(
            f'Добро пожаловать в АгроДеск!\n\n'
            f'Вы не привязаны к системе.\n'
            f'Сообщите менеджеру ваш Telegram ID: {message.from_user.id}'
        )
        return

    is_admin = await api.is_admin(message.from_user.id)
    name = employee.get('full_name') or employee.get('employee_code', '')
    await message.answer(
        f"Привет, {name}!\nДобро пожаловать в АгроДеск.\nРоль: {employee.get('role', '—')}",
        reply_markup=menu_for_user(is_admin),
    )
