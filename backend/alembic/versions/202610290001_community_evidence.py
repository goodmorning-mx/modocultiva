"""Add development community evidence storage without rewriting product state.

User explicitly authorized development-only additive migration on 2026-10-29.
Production application/release requires separate approval; the guard is deliberate.
"""
from alembic import op
from sqlalchemy import text

revision = "202610290001"
down_revision = "202609300001"
branch_labels = None
depends_on = None

# Frozen DDL: later runtime model edits must not alter this historical migration.
SCHEMA_V1 = (
    """CREATE TABLE modocultiva_progress_controls (
	user_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	revision VARCHAR(36) NOT NULL, 
	legacy_snapshot JSONB NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (user_id, organization_id), 
	FOREIGN KEY(user_id, organization_id) REFERENCES modocultiva_user_state (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_community_profiles (
	user_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	display_name VARCHAR(120) NOT NULL, 
	bio VARCHAR(500) NOT NULL, 
	discoverable BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (user_id, organization_id), 
	FOREIGN KEY(user_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_connections (
	id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	user_low VARCHAR(36) NOT NULL, 
	user_high VARCHAR(36) NOT NULL, 
	requested_by VARCHAR(36) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (organization_id, user_low, user_high), 
	CONSTRAINT ck_community_distinct_pair CHECK (user_low < user_high), 
	CONSTRAINT ck_community_request_participant CHECK (requested_by = user_low OR requested_by = user_high), 
	CONSTRAINT ck_community_connection_status CHECK (status IN ('pending', 'accepted', 'declined', 'disconnected')), 
	FOREIGN KEY(user_low, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	FOREIGN KEY(user_high, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_evidence_submissions (
	id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	mode VARCHAR(24) NOT NULL, 
	source_level INTEGER NOT NULL, 
	target_level INTEGER NOT NULL, 
	revision_number INTEGER NOT NULL, 
	activity TEXT NOT NULL, 
	activity_hash VARCHAR(64) NOT NULL, 
	draft_token VARCHAR(16) NOT NULL, 
	rubric_version VARCHAR(40) NOT NULL, 
	rubric_snapshot JSONB NOT NULL, 
	evidence JSONB NOT NULL, 
	target_alignment TEXT NOT NULL, 
	status VARCHAR(24) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	updated_at TIMESTAMP WITH TIME ZONE NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (id, organization_id, author_id), 
	UNIQUE (id, organization_id, author_id, mode, source_level), 
	UNIQUE (organization_id, author_id, mode, source_level, revision_number), 
	CONSTRAINT ck_community_activity_level CHECK (source_level BETWEEN 0 AND 8), 
	CONSTRAINT ck_community_next_clarity CHECK (target_level = source_level + 1), 
	CONSTRAINT ck_community_revision_positive CHECK (revision_number >= 1), 
	CONSTRAINT ck_community_mode CHECK (mode IN ('fisico','intelectual','emocional','arquetipico','espiritual','romantico','familiar','social','financiero','profesional','ludico','visionario')), 
	CONSTRAINT ck_community_submission_status CHECK (status IN ('pending','changes_requested','approved','superseded','withdrawn','stale')), 
	FOREIGN KEY(author_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_evidence_reviews (
	submission_id VARCHAR(36) NOT NULL, 
	reviewer_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	decision VARCHAR(24) NOT NULL, 
	activity_match BOOLEAN NOT NULL, 
	effort_match BOOLEAN NOT NULL, 
	clarity_match BOOLEAN NOT NULL, 
	feedback TEXT NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (submission_id, reviewer_id), 
	FOREIGN KEY(submission_id, organization_id, author_id) REFERENCES modocultiva_evidence_submissions (id, organization_id, author_id), 
	FOREIGN KEY(reviewer_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	CONSTRAINT ck_community_no_self_review CHECK (reviewer_id <> author_id), 
	CONSTRAINT ck_community_review_decision CHECK (decision IN ('approve','changes_requested')), 
	CONSTRAINT ck_community_all_review_criteria CHECK (decision <> 'approve' OR (activity_match AND effort_match AND clarity_match)), 
	CONSTRAINT ck_community_actionable_feedback CHECK (decision <> 'changes_requested' OR length(trim(feedback)) >= 20)
)""",
    """CREATE TABLE modocultiva_validation_receipts (
	submission_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	reviewer_ids JSONB NOT NULL, 
	advanced BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (submission_id), 
	FOREIGN KEY(submission_id, organization_id, author_id) REFERENCES modocultiva_evidence_submissions (id, organization_id, author_id)
)""",
    """CREATE TABLE modocultiva_level_advances (
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	mode VARCHAR(24) NOT NULL, 
	source_level INTEGER NOT NULL, 
	submission_id VARCHAR(36) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (organization_id, author_id, mode, source_level), 
	FOREIGN KEY(submission_id, organization_id, author_id, mode, source_level) REFERENCES modocultiva_evidence_submissions (id, organization_id, author_id, mode, source_level), 
	CONSTRAINT ck_community_advance_activity_level CHECK (source_level BETWEEN 0 AND 8)
)""",
    """CREATE TABLE modocultiva_community_notifications (
	id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	recipient_id VARCHAR(36) NOT NULL, 
	actor_id VARCHAR(36) NOT NULL, 
	kind VARCHAR(40) NOT NULL, 
	resource_id VARCHAR(36) NOT NULL, 
	read BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (organization_id, recipient_id, kind, resource_id), 
	FOREIGN KEY(recipient_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	FOREIGN KEY(actor_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_shared_cards (
	id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	mode VARCHAR(24) NOT NULL, 
	source_level INTEGER NOT NULL, 
	activity TEXT NOT NULL, 
	activity_hash VARCHAR(64) NOT NULL, 
	visible BOOLEAN NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (id, organization_id, author_id), 
	CONSTRAINT ck_community_share_activity_level CHECK (source_level BETWEEN 0 AND 8), 
	FOREIGN KEY(author_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_shared_reactions (
	card_id VARCHAR(36) NOT NULL, 
	user_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	reaction VARCHAR(16) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (card_id, user_id), 
	FOREIGN KEY(card_id, organization_id, author_id) REFERENCES modocultiva_shared_cards (id, organization_id, author_id), 
	FOREIGN KEY(user_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	CONSTRAINT ck_community_reaction CHECK (reaction IN ('leaf','soil','water','sun','roots'))
)""",
    """CREATE TABLE modocultiva_card_reuse_requests (
	id VARCHAR(36) NOT NULL, 
	card_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	requester_id VARCHAR(36) NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (card_id, requester_id), 
	FOREIGN KEY(card_id, organization_id, author_id) REFERENCES modocultiva_shared_cards (id, organization_id, author_id), 
	FOREIGN KEY(requester_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	CONSTRAINT ck_community_reuse_other CHECK (requester_id <> author_id), 
	CONSTRAINT ck_community_reuse_status CHECK (status IN ('pending','accepted','declined'))
)""",
    """CREATE TABLE modocultiva_local_idea_requests (
	id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	author_id VARCHAR(36) NOT NULL, 
	mode VARCHAR(24) NOT NULL, 
	source_level INTEGER NOT NULL, 
	status VARCHAR(20) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (id, organization_id, author_id), 
	CONSTRAINT ck_community_idea_level CHECK (source_level BETWEEN 0 AND 8), 
	CONSTRAINT ck_community_idea_status CHECK (status IN ('pending','cancelled')), 
	FOREIGN KEY(author_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id)
)""",
    """CREATE TABLE modocultiva_local_idea_offers (
	id VARCHAR(36) NOT NULL, 
	request_id VARCHAR(36) NOT NULL, 
	organization_id VARCHAR(128) NOT NULL, 
	requester_id VARCHAR(36) NOT NULL, 
	responder_id VARCHAR(36) NOT NULL, 
	activity TEXT NOT NULL, 
	activity_hash VARCHAR(64) NOT NULL, 
	created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
	PRIMARY KEY (id), 
	UNIQUE (request_id, responder_id), 
	FOREIGN KEY(request_id, organization_id, requester_id) REFERENCES modocultiva_local_idea_requests (id, organization_id, author_id), 
	FOREIGN KEY(responder_id, organization_id) REFERENCES gm_auth_memberships (user_id, organization_id), 
	CONSTRAINT ck_community_idea_other CHECK (responder_id <> requester_id)
)""",
    """CREATE INDEX ix_community_connections_high ON modocultiva_connections (organization_id, user_high, status)""",
    """CREATE INDEX ix_community_connections_low ON modocultiva_connections (organization_id, user_low, status)""",
    """CREATE INDEX ix_community_submissions_author ON modocultiva_evidence_submissions (organization_id, author_id, status)""",
    """CREATE INDEX ix_community_notifications_recipient ON modocultiva_community_notifications (organization_id, recipient_id, read)""",
)


def upgrade():
    from app.config import get_settings

    if get_settings().app_env.strip().lower() not in {"local", "test", "dev", "development"}:
        raise RuntimeError("Community migration is approved only for development; production needs separate approval.")
    for statement in SCHEMA_V1:
        op.execute(text(statement))
    # Snapshot historical manual confirmations in a NEW table. Do not alter the
    # existing JSON, presets, level assessments, images or original timestamps.
    op.execute(text("""
        INSERT INTO modocultiva_progress_controls
            (user_id, organization_id, revision, legacy_snapshot)
        SELECT user_id, organization_id, gen_random_uuid()::text,
            jsonb_build_object(
                'activityDrafts', COALESCE(state->'activityDrafts', '{}'::jsonb),
                'activityCompletions', COALESCE(state->'activityCompletions', '{}'::jsonb)
            )
        FROM modocultiva_user_state
        ON CONFLICT (user_id, organization_id) DO NOTHING
    """))


def downgrade():
    raise RuntimeError("Community evidence and reviews must not be dropped by a routine rollback. Obtain a data-preserving rollback plan and explicit approval.")
