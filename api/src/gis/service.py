import json

from geoalchemy2 import Geometry
from sqlalchemy import select as sa_select
from sqlalchemy import text
from sqlmodel import cast, col, func
from sqlmodel.ext.asyncio.session import AsyncSession

from src.gis.models import AdminBoundary
from src.gis.schemas import DistrictAmenities, DistrictBoundary, DistrictDensity, DistrictSupply

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


async def list_boundaries(session: AsyncSession) -> list[DistrictBoundary]:
    geom_as_geometry = cast(col(AdminBoundary.geom), Geometry())
    unified_geom = func.ST_UnaryUnion(func.ST_Collect(geom_as_geometry))
    stmt = (
        sa_select(
            col(AdminBoundary.sgg_code),
            func.ST_AsGeoJSON(func.ST_SimplifyPreserveTopology(unified_geom, SIMPLIFY_TOLERANCE_DEG)).label("geojson"),
        )
        .where(col(AdminBoundary.sgg_code).is_not(None))
        .group_by(col(AdminBoundary.sgg_code))
        .order_by(col(AdminBoundary.sgg_code))
    )

    rows = (await session.execute(stmt)).all()  # ty: ignore[deprecated] -- Row tuples wanted, exec() would scalar-collapse
    return [
        DistrictBoundary(sgg_code=sgg_code, rings=_rings_from_geojson(geojson))
        for sgg_code, geojson in rows
        if sgg_code and geojson
    ]


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


SUPPLY_SQL = """
WITH grid AS (
    SELECT ab.id AS boundary_id,
           SUM(COALESCE((g.industry_mix->>'coffee')::int, 0))      AS coffee,
           SUM(COALESCE((g.industry_mix->>'convenience')::int, 0)) AS convenience,
           SUM(COALESCE((g.industry_mix->>'koreanFood')::int, 0))  AS korean_food,
           SUM(COALESCE((g.industry_mix->>'pharmacy')::int, 0))    AS pharmacy,
           SUM(COALESCE((g.industry_mix->>'salon')::int, 0))       AS salon
    FROM admin_boundary ab
    JOIN industry_population_grid g
      ON ST_Contains(ab.geom::geometry, ST_Centroid(g.geom::geometry))
    GROUP BY ab.id
),
supply AS (
    SELECT ab.id AS boundary_id,
           count(hp.id) AS projects,
           COALESCE(sum(hp.total_units), 0) AS units
    FROM admin_boundary ab
    LEFT JOIN housing_project hp
      ON hp.geom IS NOT NULL AND ST_Contains(ab.geom::geometry, hp.geom::geometry)
    GROUP BY ab.id
)
SELECT ab.emd_code,
       ab.emd_name,
       ab.population,
       ab.youth_share,
       ST_Area(ab.geom) / 1000000.0 AS area_km2,
       COALESCE(s.projects, 0) AS projects,
       COALESCE(s.units, 0) AS units,
       COALESCE(gr.coffee, 0) AS coffee,
       COALESCE(gr.convenience, 0) AS convenience,
       COALESCE(gr.korean_food, 0) AS korean_food,
       COALESCE(gr.pharmacy, 0) AS pharmacy,
       COALESCE(gr.salon, 0) AS salon
FROM admin_boundary ab
LEFT JOIN grid gr ON gr.boundary_id = ab.id
LEFT JOIN supply s ON s.boundary_id = ab.id
WHERE ab.population IS NOT NULL AND ab.population > 0 AND ab.emd_name IS NOT NULL
"""


async def list_supply(session: AsyncSession) -> list[DistrictSupply]:
    """
    Per-법정동 demand (선도소프트 population grid) against supply (BMC stock).

    `supply_gap` is deliberately simple so it can be defended out loud:
    how many residents would be covered if this 동 were supplied at the
    citywide rate but currently are not, scaled against the worst 동 in the
    city. Ranking on population rather than density is the point: a 722-person
    원도심 동 with no units is not a policy problem, a 97,000-person 동 with
    57 units is.
    """
    result = await session.execute(text(SUPPLY_SQL))  # ty:ignore[deprecated]
    rows = list(result)
    if not rows:
        return []

    total_units = sum(int(r.units) for r in rows)
    total_population = sum(int(r.population) for r in rows)
    city_units_per_thousand = (total_units / total_population * 1000) if total_population else 0.0

    shortfalls: dict[str, float] = {}
    for row in rows:
        population = int(row.population)
        units_per_thousand = int(row.units) / population * 1000
        shortfall = 1.0 - min(1.0, units_per_thousand / city_units_per_thousand) if city_units_per_thousand else 1.0
        shortfalls[row.emd_code] = population * shortfall
    gap_reference = max(shortfalls.values()) or 1.0

    districts: list[DistrictSupply] = []
    for row in rows:
        area_km2 = float(row.area_km2) or 0.0001
        population = int(row.population)
        density = population / area_km2
        units_per_thousand = int(row.units) / population * 1000
        amenity_total = int(row.coffee) + int(row.convenience) + int(row.korean_food) + int(row.pharmacy) + int(row.salon)

        underserved = shortfalls[row.emd_code]

        districts.append(
            DistrictSupply(
                emd_code=row.emd_code,
                emd_name=row.emd_name,
                population=population,
                youth_share=float(row.youth_share) if row.youth_share is not None else None,
                area_km2=round(area_km2, 4),
                density_per_km2=round(density, 1),
                projects=int(row.projects),
                units=int(row.units),
                units_per_thousand=round(units_per_thousand, 2),
                amenities=DistrictAmenities(
                    coffee=int(row.coffee),
                    convenience=int(row.convenience),
                    korean_food=int(row.korean_food),
                    pharmacy=int(row.pharmacy),
                    salon=int(row.salon),
                ),
                amenity_total=amenity_total,
                amenities_per_thousand=round(amenity_total / population * 1000, 2),
                supply_gap=round(min(1.0, underserved / gap_reference) * 100, 1),
                underserved_residents=int(round(underserved)),
            )
        )

    districts.sort(key=lambda d: d.supply_gap, reverse=True)
    return districts
