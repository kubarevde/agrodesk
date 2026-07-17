"""Agro plan field_ids schema / coercion + create regression notes."""

from datetime import date
from uuid import uuid4

from app.schemas.agro_plan import AgroPlanCreate, AgroPlanUpdate


def test_create_accepts_field_ids():
    fid = uuid4()
    wt = uuid4()
    payload = AgroPlanCreate(
        field_ids=[fid],
        work_type_id=wt,
        planned_date=date(2026, 7, 17),
        notes='Культивация',
    )
    assert payload.field_ids == [fid]
    assert payload.notes == 'Культивация'


def test_create_accepts_multiple_field_ids():
    fid_a = uuid4()
    fid_b = uuid4()
    wt = uuid4()
    payload = AgroPlanCreate(
        field_ids=[fid_a, fid_b],
        work_type_id=wt,
        planned_date=date(2026, 7, 20),
        notes='Два поля',
        implement_id=uuid4(),
    )
    assert payload.field_ids == [fid_a, fid_b]
    assert payload.implement_id is not None


def test_create_accepts_empty_notes():
    fid = uuid4()
    wt = uuid4()
    payload = AgroPlanCreate(
        field_ids=[fid],
        work_type_id=wt,
        planned_date=date(2026, 7, 17),
        notes=None,
    )
    assert payload.notes is None


def test_create_accepts_legacy_field_id():
    fid = uuid4()
    wt = uuid4()
    payload = AgroPlanCreate.model_validate(
        {
            'field_id': str(fid),
            'work_type_id': str(wt),
            'planned_date': '2026-07-17',
        }
    )
    assert payload.field_ids == [fid]


def test_create_requires_at_least_one_field():
    wt = uuid4()
    try:
        AgroPlanCreate(field_ids=[], work_type_id=wt, planned_date=date(2026, 7, 17))
        raised = False
    except Exception:
        raised = True
    assert raised


def test_update_accepts_field_ids():
    fid_a = uuid4()
    fid_b = uuid4()
    payload = AgroPlanUpdate(field_ids=[fid_a, fid_b], notes='Обновлено')
    assert payload.field_ids == [fid_a, fid_b]
    assert payload.notes == 'Обновлено'
