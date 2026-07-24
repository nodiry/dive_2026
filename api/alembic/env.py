import asyncio
import importlib
import pkgutil
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from geoalchemy2 import alembic_helpers
from sqlmodel import SQLModel

sys.path.insert(0, str(Path(__file__).parent.parent))

import src
from src.database import engine

for _, name, _ in pkgutil.walk_packages(src.__path__, prefix="src."):
    if name.endswith(".models") and name != "src.models":
        importlib.import_module(name)

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata
EXCLUDED_TABLES = {"spatial_ref_sys"}


def include_object(obj, name, type_, reflected, compare_to):
    if type_ == "table" and name in EXCLUDED_TABLES:
        return False
    if type_ == "index" and name is not None and name.endswith("_geom"):
        return False
    return alembic_helpers.include_object(
        obj, name, type_, reflected, compare_to
    )


def include_name(name, type_, _parent_names):
    if type_ == "table":
        return name in target_metadata.tables
    return True


def do_migrations(connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        include_name=include_name,
        include_object=include_object,
        render_item=alembic_helpers.render_item,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_online() -> None:
    async with engine.connect() as connection:
        await connection.run_sync(do_migrations)
    await engine.dispose()


if context.is_offline_mode():
    context.configure(
        url=str(engine.url), target_metadata=target_metadata, literal_binds=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    asyncio.run(run_online())
