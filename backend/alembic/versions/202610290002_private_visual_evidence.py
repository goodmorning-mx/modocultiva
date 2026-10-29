"""Add private uploaded video evidence (development-only additive change)."""
from alembic import op
from sqlalchemy import text

revision = "202610290002"
down_revision = "202610290001"
branch_labels = None
depends_on = None

# Immutable DDL snapshot; never regenerate a historical migration at runtime.
SCHEMA_V2 = (
    """CREATE TABLE modocultiva_private_evidence_media (
	id VARCHAR(36) NOT NULL,
	organization_id VARCHAR(128) NOT NULL,
	author_id VARCHAR(36) NOT NULL,
	mime_type VARCHAR(32) NOT NULL,
	byte_size INTEGER NOT NULL,
	sha256 VARCHAR(64) NOT NULL,
	content BYTEA NOT NULL,
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
	PRIMARY KEY (id),
	FOREIGN KEY(author_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id),
	CONSTRAINT ck_community_private_video_type CHECK (mime_type IN ('video/mp4','video/webm')),
	CONSTRAINT ck_community_private_video_size CHECK (byte_size > 0 AND byte_size <= 20971520)
)""",
    """CREATE INDEX ix_community_private_media_author ON modocultiva_private_evidence_media (organization_id, author_id, created_at)""",
)


def upgrade():
    from app.config import get_settings
    if get_settings().app_env.strip().lower() not in {"local", "test", "dev", "development"}:
        raise RuntimeError("Private media migration is approved only for development; production needs separate approval.")
    for statement in SCHEMA_V2:
        op.execute(text(statement))


def downgrade():
    raise RuntimeError("Private visual evidence must not be dropped by a routine rollback; obtain explicit data-preserving approval.")
