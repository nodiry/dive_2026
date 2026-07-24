from datetime import date, datetime

from geoalchemy2 import Geography
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import (
    CheckConstraint,
    Column,
    DateTime,
    Field,
    Numeric,
    SQLModel,
    UniqueConstraint,
)


class HousingProject(SQLModel, table=True):
    __tablename__ = "housing_project"
    __table_args__ = (
        CheckConstraint(
            "type IN ('purchased', 'redevelopment', 'integrated', 'happy')",
            name="type",
        ),
        UniqueConstraint("type", "project_name", "address"),
    )

    id: int | None = Field(default=None, primary_key=True)
    type: str = Field(index=True)
    project_name: str
    address: str
    geom: str | None = Field(default=None, sa_column=Column(Geography("POINT", srid=4326)))
    built_date: date | None = None
    total_units: int | None = None
    source_district: str | None = None


class HousingUnit(SQLModel, table=True):
    __tablename__ = "housing_unit"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="housing_project.id", ondelete="CASCADE", index=True)
    dong: str | None = None
    ho: str | None = None
    room_count: int | None = None
    area_m2: float | None = Field(default=None, sa_type=Numeric)
    has_elevator: bool | None = None
    parking_spots: int | None = None


class HousingPrice(SQLModel, table=True):
    __tablename__ = "housing_price"

    id: int | None = Field(default=None, primary_key=True)
    project_id: int = Field(foreign_key="housing_project.id", ondelete="CASCADE", index=True)
    unit_type: str | None = None
    deposit: float | None = Field(default=None, sa_type=Numeric, index=True)
    rent: float | None = Field(default=None, sa_type=Numeric)
    segment: dict | None = Field(default=None, sa_type=JSONB)
    registered_at: datetime | None = Field(default=None, sa_type=DateTime(timezone=True))
