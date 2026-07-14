import math
from datetime import date, datetime, time
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
