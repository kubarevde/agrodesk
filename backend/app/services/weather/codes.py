"""WMO weather codes and MET Norway symbol → WMO-like mapping.

Open-Meteo returns official WMO interpretation codes.
MET Norway returns textual symbol_code; we map to the closest WMO code
so majority voting across sources is meaningful.
"""

from __future__ import annotations

# Higher = more severe for tie-breaking when vote counts are equal.
WMO_SEVERITY: dict[int, int] = {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    45: 4,
    48: 4,
    51: 5,
    53: 6,
    55: 7,
    56: 6,
    57: 7,
    61: 8,
    63: 9,
    65: 10,
    66: 9,
    67: 10,
    71: 8,
    73: 9,
    75: 10,
    77: 8,
    80: 8,
    81: 9,
    82: 10,
    85: 8,
    86: 9,
    95: 11,
    96: 12,
    99: 12,
}

WMO_LABELS_RU: dict[int, str] = {
    0: 'Ясно',
    1: 'Преимущественно ясно',
    2: 'Переменная облачность',
    3: 'Пасмурно',
    45: 'Туман',
    48: 'Изморозь',
    51: 'Морось',
    53: 'Морось',
    55: 'Сильная морось',
    56: 'Ледяная морось',
    57: 'Сильная ледяная морось',
    61: 'Небольшой дождь',
    63: 'Дождь',
    65: 'Сильный дождь',
    66: 'Ледяной дождь',
    67: 'Сильный ледяной дождь',
    71: 'Небольшой снег',
    73: 'Снег',
    75: 'Сильный снег',
    77: 'Снежные зёрна',
    80: 'Ливень',
    81: 'Сильный ливень',
    82: 'Очень сильный ливень',
    85: 'Снегопад',
    86: 'Сильный снегопад',
    95: 'Гроза',
    96: 'Гроза с градом',
    99: 'Сильная гроза с градом',
}


def wmo_label(code: int) -> str:
    return WMO_LABELS_RU.get(code, f'Код {code}')


def met_symbol_to_wmo(symbol: str) -> int:
    """Map MET Norway symbol_code base (without _day/_night/_polartwilight) to WMO-like."""
    base = symbol.split('_', 1)[0].lower()
    mapping = {
        'clearsky': 0,
        'fair': 1,
        'partlycloudy': 2,
        'cloudy': 3,
        'fog': 45,
        'lightrainshowers': 80,
        'rainshowers': 80,
        'heavyrainshowers': 81,
        'lightrainshowersandthunder': 95,
        'rainshowersandthunder': 95,
        'heavyrainshowersandthunder': 95,
        'lightsleetshowers': 66,
        'sleetshowers': 66,
        'heavysleetshowers': 67,
        'lightsleetshowersandthunder': 95,
        'sleetshowersandthunder': 95,
        'heavysleetshowersandthunder': 95,
        'lightsnowshowers': 85,
        'snowshowers': 85,
        'heavysnowshowers': 86,
        'lightsnowshowersandthunder': 95,
        'snowshowersandthunder': 95,
        'heavysnowshowersandthunder': 95,
        'lightrain': 61,
        'rain': 63,
        'heavyrain': 65,
        'lightrainandthunder': 95,
        'rainandthunder': 95,
        'heavyrainandthunder': 95,
        'lightsleet': 66,
        'sleet': 66,
        'heavysleet': 67,
        'lightsleetandthunder': 95,
        'sleetandthunder': 95,
        'heavysleetandthunder': 95,
        'lightsnow': 71,
        'snow': 73,
        'heavysnow': 75,
        'lightsnowandthunder': 95,
        'snowandthunder': 95,
        'heavysnowandthunder': 95,
    }
    return mapping.get(base, 3)


def severity(code: int) -> int:
    return WMO_SEVERITY.get(code, 5)
