"""
Loads a shapefile into a staging table via ogr2ogr (not hand-parsed — GDAL is
far more reliable for CRS reprojection and DBF text decoding). Uses
subprocess.run with an argv list (no shell=True) so Korean/paren/comma
filenames never need shell-escaping.

`-nlt PROMOTE_TO_MULTI` is required: Busan's admin/zoning polygons include
islands/exclaves that export as MultiPolygon, and a plain Polygon target
column would reject them.
"""

import os
import subprocess
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import urlparse

from scripts.db import DATABASE_URL


def _pg_conn_string() -> str:
    url = urlparse(DATABASE_URL)
    return (
        f"PG:host={url.hostname} port={url.port or 5432} "
        f"user={url.username} dbname={url.path.lstrip('/')} password={url.password}"
    )


def ogr2ogr_to_staging(
    shp_path: Path,
    staging_table: str,
    source_srs: str | None = None,
    select: list[str] | None = None,
    encoding: str = "EUC-KR",
) -> None:
    args = [
        "ogr2ogr",
        "-f",
        "PostgreSQL",
        _pg_conn_string(),
        str(shp_path),
        "-nln",
        staging_table,
        "-overwrite",
        "-nlt",
        "PROMOTE_TO_MULTI",
        "-lco",
        "GEOMETRY_NAME=geom",
        "-t_srs",
        "EPSG:4326",
    ]
    if source_srs:
        args += ["-s_srs", source_srs]
    if select:
        args += ["-select", ",".join(select)]

    # The 선도소프트 layers ship .cpg=UTF8; the government SHPs are EUC-KR.
    env = {**os.environ, "SHAPE_ENCODING": encoding}
    result = subprocess.run(args, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ogr2ogr failed for {staging_table}:\n{result.stderr}")


def stage_zipped_shapefile(
    zip_path: Path,
    staging_table: str,
    select: list[str] | None = None,
    encoding: str = "EUC-KR",
) -> None:
    """
    Extract a zip holding one shapefile set and stage it. Inner filenames in
    the 선도소프트 zips are EUC-KR-mangled in some years — extract via Python
    zipfile (names come out as cp437 mojibake, which is fine) and find the
    .shp by extension, never by name.
    """
    with tempfile.TemporaryDirectory() as tmp:
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(tmp)
        shp = next(Path(tmp).rglob("*.shp"), None)
        if shp is None:
            raise RuntimeError(f"no .shp found inside {zip_path}")
        ogr2ogr_to_staging(shp, staging_table, select=select, encoding=encoding)
