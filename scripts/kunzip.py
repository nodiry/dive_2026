#!/usr/bin/env python3
"""
unzip for archives with Korean filenames from arbitrary origins.

Google Drive (and several Korean portals) write zip entries whose names are
UTF-8 (or CP949) bytes but never set the zip UTF-8 flag. Info-ZIP then
decodes them as CP437, producing byte sequences APFS refuses as filenames —
`unzip` dies with "Illegal byte sequence". Python's zipfile does the same
CP437 decode, but reversibly: re-encode to the original bytes and try the
real encodings.

Usage: python3 scripts/kunzip.py <archive.zip> <dest-dir>
"""

import shutil
import sys
import zipfile
from pathlib import Path


def real_name(info: zipfile.ZipInfo) -> str:
    if info.flag_bits & 0x800:  # UTF-8 flag set — name is already correct
        return info.filename
    raw = info.filename.encode("cp437", errors="replace")
    for encoding in ("utf-8", "cp949"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return info.filename


def extract(archive: Path, dest: Path) -> None:
    with zipfile.ZipFile(archive) as zf:
        for info in zf.infolist():
            name = real_name(info)
            # zipfile already normalizes separators and strips drive/root
            # prefixes, but guard against traversal in the re-decoded name.
            target = dest / name
            if not target.resolve().is_relative_to(dest.resolve()):
                raise ValueError(f"unsafe path in archive: {name}")
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            with zf.open(info) as src, open(target, "wb") as out:
                shutil.copyfileobj(src, out)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    extract(Path(sys.argv[1]), Path(sys.argv[2]))
