"""Locations / work-types / equipment CRUD lives in references.py (mounted in main.py)."""

from app.routers.references import locations_router as router

__all__ = ['router']
