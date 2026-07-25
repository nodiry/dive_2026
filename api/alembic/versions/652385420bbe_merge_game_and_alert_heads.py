"""merge game and alert heads

Revision ID: 652385420bbe
Revises: 83d4a3c12f71, c6873a3d23cb
Create Date: 2026-07-26 04:32:45.244664

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '652385420bbe'
down_revision: Union[str, Sequence[str], None] = ('83d4a3c12f71', 'c6873a3d23cb')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
