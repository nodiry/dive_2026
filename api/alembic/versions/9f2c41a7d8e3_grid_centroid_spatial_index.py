"""grid centroid spatial index

The supply endpoint joins every 100m 선도소프트 grid cell to its 법정동 with
ST_Contains(boundary, ST_Centroid(cell)). The existing GiST index on
industry_population_grid.geom cannot serve that: the centroid is an
expression, so ST_Contains gets no && bounding-box prefilter and the planner
falls back to a 192 x 79,935 nested loop (measured: 7.6M rows discarded per
worker, 42.7s). Indexing the exact expression restores the prefilter and
takes the same query to 1.6s.

Revision ID: 9f2c41a7d8e3
Revises: 652385420bbe
Create Date: 2026-07-26
"""

from collections.abc import Sequence

from alembic import op

revision: str = "9f2c41a7d8e3"
down_revision: str | Sequence[str] | None = "652385420bbe"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("DROP INDEX IF EXISTS tmp_grid_centroid_gist")
    op.execute(
        "CREATE INDEX IF NOT EXISTS industry_population_grid_centroid_gist "
        "ON industry_population_grid USING gist (ST_Centroid(geom::geometry))"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS industry_population_grid_centroid_gist")
