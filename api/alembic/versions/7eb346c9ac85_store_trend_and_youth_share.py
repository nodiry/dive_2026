"""store trend and youth share

Revision ID: 7eb346c9ac85
Revises: 6abb6939252f
Create Date: 2026-07-25 23:36:33.530540

Trimmed by hand: autogenerate also proposed renaming every pre-convention
ix_* index — dropped that churn, this revision only adds what the feature
needs.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes


# revision identifiers, used by Alembic.
revision: str = '7eb346c9ac85'
down_revision: Union[str, Sequence[str], None] = '6abb6939252f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('district_store_trend',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('emd_code', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('year', sa.Integer(), nullable=False),
    sa.Column('store_count', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('district_store_trend_pkey'))
    )
    op.create_index(op.f('district_store_trend_emd_code_idx'), 'district_store_trend', ['emd_code'], unique=False)
    op.add_column('admin_boundary', sa.Column('youth_share', sa.Numeric(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('admin_boundary', 'youth_share')
    op.drop_index(op.f('district_store_trend_emd_code_idx'), table_name='district_store_trend')
    op.drop_table('district_store_trend')
