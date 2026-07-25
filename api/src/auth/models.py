from sqlmodel import Field

from src.models import Base


class User(Base, table=True):
    __tablename__ = "user"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    password_hash: str


class UserSession(Base, table=True):
    """An opaque bearer token — no JWT, no client-side claims to trust; every
    request looks the token up here. Simplest thing that works for a
    single-service, local-DB app; logout is just a row delete."""

    __tablename__ = "user_session"

    token: str = Field(primary_key=True)
    user_id: int = Field(foreign_key="user.id", ondelete="CASCADE", index=True)
