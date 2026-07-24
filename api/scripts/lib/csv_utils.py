"""
BMC's sample CSVs are EUC-KR encoded; the 소상공인시장진흥공단 POI dataset is
UTF-8 (its own read-me notes they switched away from EUC-KR because it was
corrupting business names). Always read via `read_csv`, passing the right
encoding — see docs/DATA_MODEL.md for which file uses which.

Python's csv module handles RFC4180 quoting (including embedded commas inside
quoted fields) natively, unlike the hand-rolled parser the original TS version
needed.
"""

import csv
import re
from datetime import date, datetime
from pathlib import Path


def read_csv(path: Path, encoding: str = "euc-kr") -> list[dict[str, str]]:
    with open(path, encoding=encoding, newline="") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def to_number(v: str | None) -> float | None:
    if not v:
        return None
    t = v.replace(",", "").strip()
    if t == "" or t.upper() == "NA":
        return None
    try:
        return float(t)
    except ValueError:
        return None


def date_from_yyyymmdd(v: str | None) -> date | None:
    """asyncpg needs a real date object for date-typed columns, not a string."""
    t = (v or "").strip()
    if not re.fullmatch(r"\d{8}", t):
        return None
    return date(int(t[0:4]), int(t[4:6]), int(t[6:8]))


def timestamp_from_mmddyyyy(v: str | None) -> datetime | None:
    """asyncpg needs a real datetime object for timestamp-typed columns, not a string."""
    t = (v or "").strip()
    m = re.fullmatch(r"(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})", t)
    if not m:
        return None
    mm, dd, yyyy, hh, mi, ss = (int(g) for g in m.groups())
    return datetime(yyyy, mm, dd, hh, mi, ss)


def strip_dong_suffix(address: str) -> str:
    """
    매입임대 unit-info rows suffix the address with a "(동명[,건물명])" annotation
    that the matching price file omits, e.g. "...100(광안동,명성갤러리3)" vs
    "...100" — strip it so both files key on the same string.
    """
    return re.sub(r"\s*\([^)]*\)?\s*$", "", address).strip()


def district_from_address(address: str) -> str | None:
    """ "부산광역시 수영구 ..." -> "수영구" — generic, not hardcoded to sample districts."""
    m = re.search(r"부산광역시\s+(\S+?(?:구|군))", address)
    return m.group(1) if m else None


def elevator_from_label(v: str | None) -> bool | None:
    if v == "설치":
        return True
    if v == "미설치":
        return False
    return None
