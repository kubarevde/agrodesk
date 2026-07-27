"""Unit tests for purchase planner service helpers."""

from app.services.purchase_planner import normalize_images


def test_normalize_images_dedupes_and_limits():
    urls = [
        '/uploads/purchase-planner/a.jpg',
        '/uploads/purchase-planner/a.jpg',
        '/uploads/purchase-planner/b.jpg',
        '/uploads/purchase-planner/c.jpg',
        '/uploads/purchase-planner/d.jpg',
        '/uploads/purchase-planner/e.jpg',
        '/uploads/purchase-planner/f.jpg',
    ]
    assert normalize_images(urls) == [
        '/uploads/purchase-planner/a.jpg',
        '/uploads/purchase-planner/b.jpg',
        '/uploads/purchase-planner/c.jpg',
        '/uploads/purchase-planner/d.jpg',
        '/uploads/purchase-planner/e.jpg',
    ]
