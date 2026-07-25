"""merge population and auth heads

Revision ID: 64068f631d11
Revises: a9c4e7b2d1f0, e8939c897461
Create Date: 2026-07-25 12:35:34.815344

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '64068f631d11'
down_revision: Union[str, Sequence[str], None] = ('a9c4e7b2d1f0', 'e8939c897461')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
