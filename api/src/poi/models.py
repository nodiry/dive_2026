from geoalchemy2 import Geography
from sqlmodel import Column, Field, SQLModel


class CommercialPoi(SQLModel, table=True):
    __tablename__ = "commercial_poi"

    id: int | None = Field(default=None, primary_key=True)
    category: str = Field(index=True)
    category_name: str | None = None
    biz_name: str | None = None
    address: str | None = None
    district: str | None = Field(default=None, index=True)
    geom: str = Field(sa_column=Column(Geography("POINT", srid=4326), nullable=False))
