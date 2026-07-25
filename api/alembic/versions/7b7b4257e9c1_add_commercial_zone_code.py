"""add commercial zone code

Revision ID: 7b7b4257e9c1
Revises: cb2782640811
Create Date: 2026-07-25
"""

from typing import Sequence, Union

from alembic import op

revision: str = "7b7b4257e9c1"
down_revision: Union[str, Sequence[str], None] = "cb2782640811"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE commercial_zone ADD COLUMN IF NOT EXISTS zone_code TEXT")
    op.execute(
        "CREATE INDEX IF NOT EXISTS commercial_zone_zone_code_idx "
        "ON commercial_zone (zone_code)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS commercial_zone_zone_code_idx")
    op.execute("ALTER TABLE commercial_zone DROP COLUMN IF EXISTS zone_code")
