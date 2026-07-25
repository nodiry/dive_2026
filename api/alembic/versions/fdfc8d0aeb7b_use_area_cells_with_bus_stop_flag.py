"""use area cells with bus stop flag

Revision ID: fdfc8d0aeb7b
Revises: 7eb346c9ac85
Create Date: 2026-07-26 01:25:58.664928

Autogenerate also proposed renaming every ix_*/…_idx index across the schema
(SQLModel changed its default index naming); those are cosmetic and unrelated
to this change, so they were stripped and only the new table is created here.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes
from geoalchemy2 import Geography

# revision identifiers, used by Alembic.
revision: str = 'fdfc8d0aeb7b'
down_revision: Union[str, Sequence[str], None] = '7eb346c9ac85'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'use_area_cell',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('zone_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('zone_name', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column('bus_stop', sa.Boolean(), nullable=False),
        sa.Column(
            'geom',
            Geography(geometry_type='MULTIPOLYGON', srid=4326, dimension=2, from_text='ST_GeogFromText', name='geography', nullable=False),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint('id', name=op.f('use_area_cell_pkey')),
    )
    op.create_index(op.f('use_area_cell_bus_stop_idx'), 'use_area_cell', ['bus_stop'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('use_area_cell_bus_stop_idx'), table_name='use_area_cell')
    op.drop_table('use_area_cell')
