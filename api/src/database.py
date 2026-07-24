from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from pydantic_settings import SettingsConfigDict
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import SettingsBase


class DatabaseConfig(SettingsBase):
    model_config = SettingsConfigDict(env_prefix="DATABASE_")

    URL: str = ""
    SSL: bool = False


db_config = DatabaseConfig()
connect_args = {"ssl": "require"} if db_config.SSL else {}
engine = create_async_engine(
    db_config.URL,
    pool_pre_ping=True,
    pool_size=3,
    max_overflow=2,
    connect_args=connect_args,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session() as session:
        yield session


SessionDep = Annotated[AsyncSession, Depends(get_db)]
