import json

from geoalchemy2 import Geometry
from sqlalchemy import select as sa_select
from sqlmodel import cast, col, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.gis.models import AdminBoundary
from src.gis.schemas import DistrictDensity

SIMPLIFY_TOLERANCE_DEG = 0.0004


def _rings_from_geojson(raw: str) -> list[list[list[float]]]:
    geo = json.loads(raw)
    polygons = geo["coordinates"] if geo["type"] == "MultiPolygon" else [geo["coordinates"]]
    rings: list[list[list[float]]] = []
    for polygon in polygons:
        if not polygon:
            continue
        outer = polygon[0]
        rings.append([[lat, lng] for lng, lat in outer])
    return rings


async def list_density(session: AsyncSession) -> list[DistrictDensity]:
    geom_as_geometry = cast(col(AdminBoundary.geom), Geometry())
    stmt = sa_select(
        col(AdminBoundary.emd_code),
        col(AdminBoundary.emd_name),
        col(AdminBoundary.population),
        func.ST_Area(col(AdminBoundary.geom)).label("area_m2"),
        func.ST_Y(func.ST_Centroid(geom_as_geometry)).label("centroid_lat"),
        func.ST_X(func.ST_Centroid(geom_as_geometry)).label("centroid_lng"),
        func.ST_AsGeoJSON(func.ST_SimplifyPreserveTopology(geom_as_geometry, SIMPLIFY_TOLERANCE_DEG)).label("geojson"),
    ).where(col(AdminBoundary.population).is_not(None))

    rows = (await session.execute(stmt)).all()  # ty: ignore[deprecated] -- Row tuples wanted, exec() would scalar-collapse

    regions: list[DistrictDensity] = []
    for emd_code, emd_name, population, area_m2, centroid_lat, centroid_lng, geojson in rows:
        if population is None or not area_m2:
            continue
        area_km2 = float(area_m2) / 1_000_000
        regions.append(
            DistrictDensity(
                emd_code=emd_code,
                emd_name=emd_name or emd_code,
                population=population,
                area_km2=round(area_km2, 4),
                density_per_km2=round(population / area_km2, 1),
                centroid_lat=float(centroid_lat),
                centroid_lng=float(centroid_lng),
                rings=_rings_from_geojson(geojson),
            )
        )
    return regions
