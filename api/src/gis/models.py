from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Column, Field, Numeric, SQLModel


class AdminBoundary(SQLModel, table=True):
    __tablename__ = "admin_boundary"

    id: int | None = Field(default=None, primary_key=True)
    emd_code: str = Field(index=True)
    emd_name: str | None = None
    sgg_code: str | None = None
    population: int | None = None
    # share of residents in their 20s-30s (0..1), interpolated from the
    # 선도소프트 POP_STORE age bands — see scripts/seed_population.py
    youth_share: float | None = Field(default=None, sa_type=Numeric)
    geom: str = Field(sa_column=Column(Geography("MULTIPOLYGON", srid=4326), nullable=False))


class CommercialZone(SQLModel, table=True):
    __tablename__ = "commercial_zone"

    id: int | None = Field(default=None, primary_key=True)
    zone_type: str | None = None
    zone_code: str | None = Field(default=None, index=True)
    geom: str = Field(sa_column=Column(Geography("MULTIPOLYGON", srid=4326), nullable=False))


class Building(SQLModel, table=True):
    __tablename__ = "building"

    id: int | None = Field(default=None, primary_key=True)
    buld_name: str | None = Field(default=None, index=True)
    emd_code: str | None = None
    geom: str = Field(sa_column=Column(Geography("MULTIPOLYGON", srid=4326), nullable=False))


class IndustryPopulationGrid(SQLModel, table=True):
    __tablename__ = "industry_population_grid"

    id: int | None = Field(default=None, primary_key=True)
    geom: str = Field(sa_column=Column(Geography("MULTIPOLYGON", srid=4326), nullable=False))
    industry_mix: dict | None = Field(default=None, sa_type=JSONB)
    population_density: float | None = Field(default=None, sa_type=Numeric)


class DistrictStoreTrend(SQLModel, table=True):
    """Yearly store counts per 법정동, from the 선도소프트 상가-건물 융합데이터
    (2021-2024) — powers the commercial-trend badge on housing detail."""

    __tablename__ = "district_store_trend"

    id: int | None = Field(default=None, primary_key=True)
    emd_code: str = Field(index=True)
    year: int
    store_count: int


class UseAreaCell(SQLModel, table=True):
    """
    One cell of the 선도소프트 상권-주거 융합데이터 (dataset 03): the zoning
    designation plus a bus-stop flag, pre-joined by the partner. `bus_stop`
    is the per-cell BSST_YN, which is the only transit signal in any of the
    provided data.
    """

    __tablename__ = "use_area_cell"

    id: int | None = Field(default=None, primary_key=True)
    zone_code: str | None = None
    zone_name: str | None = None
    bus_stop: bool = Field(default=False, index=True)
    geom: str = Field(sa_column=Column(Geography("MULTIPOLYGON", srid=4326), nullable=False))
