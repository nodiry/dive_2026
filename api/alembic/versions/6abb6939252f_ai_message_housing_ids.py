"""ai message housing ids

Revision ID: 6abb6939252f
Revises: 3d919456bd42
Create Date: 2026-07-25 14:08:50.414322

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = '6abb6939252f'
down_revision: Union[str, Sequence[str], None] = '3d919456bd42'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('ai_message', sa.Column('housing_ids', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('ai_message', 'housing_ids')
