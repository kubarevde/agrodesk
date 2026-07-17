import math
from datetime import date, datetime, time, timedelta
from decimal import Decimal


def calc_duration_minutes(start_time: time, end_time: time) -> int:
    start_minutes = start_time.hour * 60 + start_time.minute
    end_minutes = end_time.hour * 60 + end_time.minute
    return end_minutes - start_minutes


def calc_duration_from_datetimes(start_dt: datetime, end_dt: datetime) -> int:
    return max(int((end_dt - start_dt).total_seconds() // 60), 0)


def calc_duration_rounded(duration_raw: int) -> Decimal:
    return Decimal(str(math.ceil(duration_raw / 30) * 0.5))


def combine_date_time(value_date: date, value_time: time) -> datetime:
    return datetime.combine(value_date, value_time)


def resolve_shift_end_datetime(
    start_date: date,
    start_time: time,
    end_time: time,
    end_date: date | None = None,
) -> datetime:
    if end_date is not None:
        return combine_date_time(end_date, end_time)
    end_dt = combine_date_time(start_date, end_time)
    if end_time < start_time:
        end_dt = end_dt + timedelta(days=1)
    return end_dt


def calc_manual_duration_minutes(
    start_date: date,
    start_time: time,
    end_time: time,
    end_date: date | None = None,
) -> int:
    start_dt = combine_date_time(start_date, start_time)
    end_dt = resolve_shift_end_datetime(start_date, start_time, end_time, end_date)
    return calc_duration_from_datetimes(start_dt, end_dt)


def shift_time_range(
    shift_date: date,
    start_time: time,
    end_time: time | None,
    *,
    now: datetime | None = None,
) -> tuple[datetime, datetime | None]:
    start_dt = combine_date_time(shift_date, start_time)
    if end_time is None:
        return start_dt, now
    end_dt = resolve_shift_end_datetime(shift_date, start_time, end_time)
    return start_dt, end_dt


def ranges_overlap(
    start_a: datetime,
    end_a: datetime,
    start_b: datetime,
    end_b: datetime,
) -> bool:
    return start_a < end_b and end_a > start_b
