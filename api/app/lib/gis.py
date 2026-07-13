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
from pathlib import Path
from urllib.parse import urlparse

from app.db import DATABASE_URL


def _pg_conn_string() -> str:
    url = urlparse(DATABASE_URL)
    return (
        f"PG:host={url.hostname} port={url.port or 5432} "
        f"user={url.username} dbname={url.path.lstrip('/')} password={url.password}"
    )


def ogr2ogr_to_staging(shp_path: Path, staging_table: str, source_srs: str | None = None) -> None:
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

    env = {**os.environ, "SHAPE_ENCODING": "EUC-KR"}
    result = subprocess.run(args, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ogr2ogr failed for {staging_table}:\n{result.stderr}")
