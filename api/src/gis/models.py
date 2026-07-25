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
