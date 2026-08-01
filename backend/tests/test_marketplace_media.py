"""Marketplace media via existing uploads — Pillow/router unchanged; limits enforced."""

from __future__ import annotations

import asyncio
import io
from pathlib import Path

import pytest
from fastapi import UploadFile
from PIL import Image
from pydantic import ValidationError
from starlette.datastructures import Headers

from app.config import settings
from app.routers.uploads import ALLOWED_FOLDERS, save_image_locally
from app.schemas.marketplace import MarketListingCreate
from app.services.marketplace_media import (
    LISTING_PHOTOS_MAX,
    MARKETPLACE_UPLOAD_PREFIX,
    normalize_listing_photos,
)


def _png_bytes(size: tuple[int, int] = (64, 64)) -> bytes:
    buf = io.BytesIO()
    Image.new('RGB', size, color=(20, 120, 40)).save(buf, format='PNG')
    return buf.getvalue()


def test_marketplace_folder_allowed_in_existing_upload_service() -> None:
    assert 'marketplace' in ALLOWED_FOLDERS


def test_normalize_listing_photos_caps_and_prefix() -> None:
    urls = [f'{MARKETPLACE_UPLOAD_PREFIX}{i:032x}.jpg' for i in range(LISTING_PHOTOS_MAX)]
    assert normalize_listing_photos(urls) == urls
    assert normalize_listing_photos([]) == []
    assert normalize_listing_photos([urls[0], urls[0]]) == [urls[0]]


def test_normalize_listing_photos_rejects_over_limit() -> None:
    urls = [f'{MARKETPLACE_UPLOAD_PREFIX}{i:032x}.jpg' for i in range(LISTING_PHOTOS_MAX + 1)]
    with pytest.raises(Exception) as exc:
        normalize_listing_photos(urls)
    assert getattr(exc.value, 'status_code', None) == 422


def test_normalize_listing_photos_rejects_foreign_url() -> None:
    with pytest.raises(Exception) as exc:
        normalize_listing_photos(['https://evil.example/a.jpg'])
    assert getattr(exc.value, 'status_code', None) == 422


def test_listing_create_schema_rejects_over_limit() -> None:
    photos = [f'{MARKETPLACE_UPLOAD_PREFIX}{i:032x}.jpg' for i in range(LISTING_PHOTOS_MAX + 1)]
    with pytest.raises(ValidationError):
        MarketListingCreate(title='Too many', unit='кг', photos=photos)


def test_listing_create_schema_accepts_max_photos() -> None:
    photos = [f'{MARKETPLACE_UPLOAD_PREFIX}{i:032x}.jpg' for i in range(LISTING_PHOTOS_MAX)]
    row = MarketListingCreate(title='Ok', unit='кг', photos=photos)
    assert len(row.photos) == LISTING_PHOTOS_MAX


def test_save_image_locally_marketplace_folder() -> None:
    """Existing save_image_locally + Pillow path; folder=marketplace only."""

    async def run() -> str:
        upload = UploadFile(
            filename='shot.png',
            file=io.BytesIO(_png_bytes()),
            headers=Headers({'content-type': 'image/png'}),
        )
        return await save_image_locally(upload, 'marketplace')

    url = asyncio.run(run())
    assert url.startswith(MARKETPLACE_UPLOAD_PREFIX)
    assert url.endswith('.jpg')
    path = Path(settings.UPLOADS_DIR) / 'marketplace' / Path(url).name
    assert path.is_file(), f'missing {path}'
