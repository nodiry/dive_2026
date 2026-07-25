"""
The 2026-06-30 BMC handout mixes encodings file-by-file: five CSVs are
UTF-8 with a BOM, but 매입임대 표준보증금 is CP949 — pass encoding="auto"
and `read_csv` tries utf-8-sig first, then cp949. The 소상공인시장진흥공단
POI dataset is plain UTF-8. See docs/DATA_MODEL.md for which file uses which.

Python's csv module handles RFC4180 quoting (including embedded commas inside
quoted fields) natively, unlike the hand-rolled parser the original TS version
needed.
"""

import csv
import re
from datetime import date, datetime
from pathlib import Path


def _read_csv_with(path: Path, encoding: str) -> list[dict[str, str]]:
    with open(path, encoding=encoding, newline="") as f:
        return [{k: (v or "").strip() for k, v in row.items()} for row in csv.DictReader(f)]


def read_csv(path: Path, encoding: str = "auto") -> list[dict[str, str]]:
    encodings = ("utf-8-sig", "cp949") if encoding == "auto" else (encoding,)
    for enc in encodings[:-1]:
        try:
            return _read_csv_with(path, enc)
        except UnicodeDecodeError:
            continue
    return _read_csv_with(path, encodings[-1])


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


def parse_date(v: str | None) -> date | None:
    """
    asyncpg needs a real date object for date-typed columns, not a string.
    Accepts both date spellings seen across BMC exports: bare `YYYYMMDD`
    (older cuts) and ISO `YYYY-MM-DD` (the 2026-06-30 handout).
    """
    t = (v or "").strip()
    m = re.fullmatch(r"(\d{4})-?(\d{2})-?(\d{2})", t)
    if not m:
        return None
    return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))


def parse_timestamp(v: str | None) -> datetime | None:
    """
    asyncpg needs a real datetime object for timestamp-typed columns, not a
    string. 등록일 was `MM-DD-YYYY HH:MM:SS` in older BMC cuts and is a bare
    ISO `YYYY-MM-DD` date in the 2026-06-30 handout — accept both.
    """
    t = (v or "").strip()
    m = re.fullmatch(r"(\d{2})-(\d{2})-(\d{4}) (\d{2}):(\d{2}):(\d{2})", t)
    if m:
        mm, dd, yyyy, hh, mi, ss = (int(g) for g in m.groups())
        return datetime(yyyy, mm, dd, hh, mi, ss)
    d = parse_date(t)
    return datetime(d.year, d.month, d.day) if d else None


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
