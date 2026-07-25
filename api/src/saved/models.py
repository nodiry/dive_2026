from sqlmodel import Field, UniqueConstraint

from src.models import Base


class SavedHousing(Base, table=True):
    __tablename__ = "saved_housing"
    __table_args__ = (UniqueConstraint("user_id", "housing_project_id"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
    housing_project_id: int = Field(foreign_key="housing_project.id", ondelete="CASCADE", index=True)
