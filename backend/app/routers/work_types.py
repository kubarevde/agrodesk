"""Locations / work-types / equipment CRUD lives in references.py (mounted in main.py)."""

from app.routers.references import work_types_router as router

__all__ = ['router']
