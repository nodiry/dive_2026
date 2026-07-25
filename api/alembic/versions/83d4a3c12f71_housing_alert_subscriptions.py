"""housing alert subscriptions

Revision ID: 83d4a3c12f71
Revises: 7eb346c9ac85
Create Date: 2026-07-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "83d4a3c12f71"
down_revision: str | Sequence[str] | None = "7eb346c9ac85"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ai_message", sa.Column("search_context", sa.JSON(), nullable=True))
    op.create_table(
        "housing_alert_subscription",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("district", sa.String(), nullable=True),
        sa.Column("housing_type", sa.String(), nullable=True),
        sa.Column("deposit_max", sa.Float(), nullable=True),
        sa.Column("built_after", sa.Integer(), nullable=True),
        sa.Column("room_count", sa.Float(), nullable=True),
        sa.Column("criteria_json", sa.JSON(), nullable=False),
        sa.Column("criteria_hash", sa.String(length=64), nullable=False),
        sa.Column("source_conversation_id", sa.Uuid(), nullable=True),
        sa.Column("source_message_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.CheckConstraint(
            "status IN ('active', 'cancelled')",
            name=op.f("housing_alert_subscription_status_check"),
        ),
        sa.ForeignKeyConstraint(
            ["source_conversation_id"],
            ["ai_conversation.id"],
            name=op.f("housing_alert_subscription_source_conversation_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["source_message_id"],
            ["ai_message.id"],
            name=op.f("housing_alert_subscription_source_message_id_fkey"),
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["user.id"],
            name=op.f("housing_alert_subscription_user_id_fkey"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("housing_alert_subscription_pkey")),
    )
    op.create_index(
        "housing_alert_subscription_active_key",
        "housing_alert_subscription",
        ["user_id", "criteria_hash"],
        unique=True,
        postgresql_where=sa.text("status = 'active'"),
    )
    op.create_index(
        "housing_alert_subscription_created_at_idx",
        "housing_alert_subscription",
        ["created_at"],
    )
    for column in ("district", "housing_type", "source_conversation_id", "source_message_id", "status", "user_id"):
        op.create_index(
            op.f(f"housing_alert_subscription_{column}_idx"),
            "housing_alert_subscription",
            [column],
        )


def downgrade() -> None:
    op.drop_table("housing_alert_subscription")
    op.drop_column("ai_message", "search_context")
