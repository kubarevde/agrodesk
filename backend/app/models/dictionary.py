"""Organization lookup dictionaries (crops, implement/inventory categories)."""

from __future__ import annotations

import re
import uuid
from typing import Literal

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func, select
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import Base

DictionaryType = Literal[
    'crop',
    'implement_category',
    'inventory_category',
    'expense_category',
]

DICTIONARY_TYPES: tuple[str, ...] = (
    'crop',
    'implement_category',
    'inventory_category',
    'expense_category',
)

DEFAULTS: dict[str, list[tuple[str, str]]] = {
    # (code, name)
    'crop': [
        ('wheat', 'Пшеница'),
        ('sunflower', 'Подсолнечник'),
        ('corn', 'Кукуруза'),
        ('barley', 'Ячмень'),
        ('rapeseed', 'Рапс'),
        ('winter', 'Озимые'),
        ('fallow', 'Пар'),
        ('other', 'Другое'),
    ],
    'implement_category': [
        ('sowing', 'Посевная'),
        ('spraying', 'Опрыскивание'),
        ('tillage', 'Обработка почвы'),
        ('harvest', 'Уборочная'),
        ('transport', 'Транспорт'),
    ],
    'inventory_category': [
        ('fuel', 'Топливо'),
        ('fertilizer', 'Удобрения'),
        ('seeds', 'Семена'),
        ('parts', 'Запчасти'),
        ('chemicals', 'СЗР'),
        ('other', 'Прочее'),
    ],
    'expense_category': [
        ('fuel', 'Топливо'),
        ('fertilizer', 'Удобрения'),
        ('parts', 'Запчасти'),
        ('salary', 'Зарплата'),
        ('rent', 'Аренда'),
        ('other', 'Прочее'),
    ],
}


class OrgDictionary(Base):
    __tablename__ = 'org_dictionaries'
    __table_args__ = (
        UniqueConstraint('org_id', 'type', 'code', name='uq_org_dictionaries_org_type_code'),
        UniqueConstraint('org_id', 'type', 'name', name='uq_org_dictionaries_org_type_name'),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'), nullable=False)
    type = Column(String(50), nullable=False)
    name = Column(String(200), nullable=False)
    code = Column(String(80), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


def slugify_code(value: str) -> str:
    text = value.strip().lower()
    # Keep latin/digits; map common Cyrillic via simple translit for fuel etc.
    translit = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'c', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    }
    out = []
    for ch in text:
        if ch in translit:
            out.append(translit[ch])
        elif ('a' <= ch <= 'z') or ('0' <= ch <= '9'):
            out.append(ch)
        elif ch in (' ', '-', '_'):
            out.append('_')
    code = re.sub(r'_+', '_', ''.join(out)).strip('_')
    return code[:80] or f'item_{uuid.uuid4().hex[:8]}'


def normalize_name(value: str) -> str:
    return ' '.join(value.replace('\u00a0', ' ').split()).strip()


async def ensure_default_dictionaries(db: AsyncSession, org_id: uuid.UUID) -> None:
    result = await db.execute(
        select(OrgDictionary.type).where(OrgDictionary.org_id == org_id).distinct()
    )
    existing_types = {row[0] for row in result.all()}
    added = False
    for dict_type, rows in DEFAULTS.items():
        if dict_type in existing_types:
            continue
        for index, (code, name) in enumerate(rows):
            db.add(
                OrgDictionary(
                    org_id=org_id,
                    type=dict_type,
                    code=code,
                    name=name,
                    is_active=True,
                    sort_order=index,
                )
            )
            added = True
    if added:
        await db.commit()
