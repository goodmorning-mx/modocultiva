"""Explicit card evidence audience; existing cards stay network-only."""
from alembic import op
from sqlalchemy import text

revision = "202610290003"
down_revision = "202610290002"
branch_labels = None
depends_on = None

# Additive frozen DDL. No publication/backfill, JSON rewrites or timestamp edits.
SCHEMA_V3 = (
    "ALTER TABLE modocultiva_shared_cards ADD COLUMN audience VARCHAR(16) DEFAULT 'network' NOT NULL",
    "ALTER TABLE modocultiva_shared_cards ADD COLUMN submission_id VARCHAR(36)",
    "ALTER TABLE modocultiva_shared_cards ADD CONSTRAINT ck_community_card_audience CHECK (audience IN ('network','public'))",
    "ALTER TABLE modocultiva_shared_cards ADD CONSTRAINT fk_community_card_submission FOREIGN KEY (submission_id, organization_id, author_id) REFERENCES modocultiva_evidence_submissions (id, organization_id, author_id)",
    "CREATE INDEX ix_community_cards_audience ON modocultiva_shared_cards (organization_id, audience, visible, created_at)",
    "CREATE INDEX ix_community_cards_submission ON modocultiva_shared_cards (submission_id, organization_id, author_id)",
)


def upgrade():
    from app.config import get_settings
    if get_settings().app_env.strip().lower() not in {"local", "test", "dev", "development"}:
        raise RuntimeError("Card audience migration is approved only for development; production needs separate approval.")
    for statement in SCHEMA_V3:
        op.execute(text(statement))


def downgrade():
    raise RuntimeError("Card audiences and evidence links must not be dropped by a routine rollback; obtain data-preserving approval.")
