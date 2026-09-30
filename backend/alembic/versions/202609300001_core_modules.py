"""Add gm-auth tables, usage ledger, and per-user product state."""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import text

revision: str = "202609300001"
down_revision: str | None = "202607150001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    from gm_auth.models import metadata

    metadata.create_all(op.get_bind())
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS gm_billing_usage (
            id VARCHAR(36) PRIMARY KEY,
            product_id VARCHAR(128) NOT NULL,
            organization_id VARCHAR(128) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            provider VARCHAR(64) NOT NULL,
            model VARCHAR(128) NOT NULL,
            input_tokens INTEGER NOT NULL,
            output_tokens INTEGER NOT NULL,
            cached_tokens INTEGER NOT NULL DEFAULT 0,
            request_id VARCHAR(255),
            provider_cost NUMERIC(18, 8) NOT NULL DEFAULT 0,
            goodmorning_charge NUMERIC(18, 8) NOT NULL DEFAULT 0,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS gm_billing_ledger (
            id VARCHAR(36) PRIMARY KEY,
            product_id VARCHAR(128) NOT NULL,
            usage_id VARCHAR(36) NOT NULL,
            organization_id VARCHAR(128) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            amount NUMERIC(18, 8) NOT NULL DEFAULT 0,
            currency VARCHAR(8) NOT NULL DEFAULT 'USD',
            entry_type VARCHAR(64) NOT NULL DEFAULT 'usage_charge',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """))
    op.execute(text("CREATE INDEX IF NOT EXISTS ix_gm_billing_usage_user ON gm_billing_usage (organization_id, user_id, created_at)"))
    op.execute(text("CREATE TABLE IF NOT EXISTS modocultiva_user_state (user_id VARCHAR(36) NOT NULL, organization_id VARCHAR(128) NOT NULL, state JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, organization_id))"))


def downgrade() -> None:
    op.execute(text("DROP TABLE IF EXISTS modocultiva_user_state"))
    op.execute(text("DROP TABLE IF EXISTS gm_billing_ledger"))
    op.execute(text("DROP TABLE IF EXISTS gm_billing_usage"))
