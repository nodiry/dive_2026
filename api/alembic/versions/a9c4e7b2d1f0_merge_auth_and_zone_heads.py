"""merge auth and commercial zone migration heads

Revision ID: a9c4e7b2d1f0
Revises: 7b7b4257e9c1, 5cd997ecdd7e
Create Date: 2026-07-25
"""

from typing import Sequence, Union

revision: str = "a9c4e7b2d1f0"
down_revision: Union[str, Sequence[str], None] = (
    "7b7b4257e9c1",
    "5cd997ecdd7e",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
