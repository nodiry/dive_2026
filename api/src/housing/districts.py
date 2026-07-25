import re

BUSAN_DISTRICTS = (
    "강서구",
    "금정구",
    "기장군",
    "남구",
    "동구",
    "동래구",
    "부산진구",
    "북구",
    "사상구",
    "사하구",
    "서구",
    "수영구",
    "연제구",
    "영도구",
    "중구",
    "해운대구",
)

BUSAN_WIDE_ALIASES = frozenset(
    {
        "전체",
        "부산",
        "부산시",
        "부산광역시",
        "부산전체",
        "부산시전체",
        "부산광역시전체",
    }
)


def is_busan_wide(value: str | None) -> bool:
    """Return whether a district argument explicitly means all of Busan."""
    if not value:
        return False
    return re.sub(r"\s+", "", value) in BUSAN_WIDE_ALIASES


def normalize_district(value: str | None) -> str | None:
    """Normalize common Busan district spellings without accepting other cities."""
    if not value:
        return None

    compact = re.sub(r"\s+", "", value)
    short = compact.removeprefix("부산광역시").removeprefix("부산시").removeprefix("부산")
    short = re.sub(r"(에서|지역|일대|근처)$", "", short)
    if short in BUSAN_DISTRICTS:
        return short
    aliases = {district.removesuffix("구").removesuffix("군"): district for district in BUSAN_DISTRICTS}
    return aliases.get(short)
