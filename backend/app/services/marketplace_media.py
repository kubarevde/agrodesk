"""Marketplace media helpers — reuse /api/uploads/image (folder=marketplace).

Does not change Pillow resize or the uploads router; only validates listing/logo URLs.
"""

from __future__ import annotations

from fastapi import HTTPException, status

# Keep in sync with FE ListingFormFields maxFiles={8} and ImageUploader.
LISTING_PHOTOS_MAX = 8
MARKETPLACE_UPLOAD_PREFIX = '/uploads/marketplace/'
MAX_PHOTO_URL_LEN = 500


def normalize_listing_photos(photos: list[str] | None) -> list[str]:
    """Dedupe, require /uploads/marketplace/ URLs, cap at LISTING_PHOTOS_MAX."""
    if not photos:
        return []
    cleaned: list[str] = []
    for item in photos:
        if not isinstance(item, str):
            continue
        url = item.strip()
        if not url:
            continue
        if len(url) > MAX_PHOTO_URL_LEN:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail='Слишком длинный URL фото',
            )
        if not url.startswith(MARKETPLACE_UPLOAD_PREFIX):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    'Фото объявления должны быть загружены через /api/uploads/image '
                    f'(папка marketplace). Ожидается URL вида {MARKETPLACE_UPLOAD_PREFIX}…'
                ),
            )
        if url not in cleaned:
            cleaned.append(url)
    if len(cleaned) > LISTING_PHOTOS_MAX:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f'Не больше {LISTING_PHOTOS_MAX} фото на объявление',
        )
    return cleaned


def normalize_marketplace_logo(logo_url: str | None) -> str | None:
    if logo_url is None:
        return None
    url = logo_url.strip()
    if not url:
        return None
    if len(url) > MAX_PHOTO_URL_LEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail='Слишком длинный URL логотипа',
        )
    if not url.startswith(MARKETPLACE_UPLOAD_PREFIX):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                'Логотип должен быть загружен через /api/uploads/image '
                f'(папка marketplace). Ожидается URL вида {MARKETPLACE_UPLOAD_PREFIX}…'
            ),
        )
    return url
