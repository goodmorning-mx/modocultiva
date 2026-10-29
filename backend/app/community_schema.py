"""Additive, organization-scoped community storage.

Definitions alone never create tables or change user state. Alembic is the sole
schema writer. Auth reference definitions are copied, not mutated or recreated.
"""
from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKeyConstraint, Index,
    Integer, JSON, MetaData, String, Table, Text, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import JSONB
from gm_auth.models import memberships, organizations, users

metadata = MetaData()
for reference in (organizations, users, memberships):
    reference.to_metadata(metadata)
document = JSON().with_variant(JSONB(), "postgresql")
user_states = Table(
    "modocultiva_user_state", metadata,
    Column("user_id", String(36), primary_key=True),
    Column("organization_id", String(128), primary_key=True),
    Column("state", document, nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
)


def member_reference(user_column: str):
    return ForeignKeyConstraint(
        [user_column, "organization_id"],
        ["gm_auth_memberships.user_id", "gm_auth_memberships.organization_id"],
    )


def created():
    return Column("created_at", DateTime(timezone=True), nullable=False, server_default=func.now())


progress_controls = Table(
    "modocultiva_progress_controls", metadata,
    Column("user_id", String(36), primary_key=True),
    Column("organization_id", String(128), primary_key=True),
    Column("revision", String(36), nullable=False),
    # Historical self-reported confirmations are preserved, never peer-reviewed.
    Column("legacy_snapshot", document, nullable=False), created(),
    ForeignKeyConstraint(["user_id", "organization_id"], ["modocultiva_user_state.user_id", "modocultiva_user_state.organization_id"]),
)
profiles = Table(
    "modocultiva_community_profiles", metadata,
    Column("user_id", String(36), primary_key=True),
    Column("organization_id", String(128), primary_key=True),
    Column("display_name", String(120), nullable=False),
    Column("bio", String(500), nullable=False),
    Column("discoverable", Boolean, nullable=False), created(),
    member_reference("user_id"),
)
connections = Table(
    "modocultiva_connections", metadata,
    Column("id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("user_low", String(36), nullable=False),
    Column("user_high", String(36), nullable=False),
    Column("requested_by", String(36), nullable=False),
    Column("status", String(20), nullable=False), created(),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("organization_id", "user_low", "user_high"),
    CheckConstraint("user_low < user_high", name="ck_community_distinct_pair"),
    CheckConstraint("requested_by = user_low OR requested_by = user_high", name="ck_community_request_participant"),
    CheckConstraint("status IN ('pending', 'accepted', 'declined', 'disconnected')", name="ck_community_connection_status"),
    member_reference("user_low"), member_reference("user_high"),
)
Index("ix_community_connections_low", connections.c.organization_id, connections.c.user_low, connections.c.status)
Index("ix_community_connections_high", connections.c.organization_id, connections.c.user_high, connections.c.status)

submissions = Table(
    "modocultiva_evidence_submissions", metadata,
    Column("id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("mode", String(24), nullable=False),
    Column("source_level", Integer, nullable=False),
    Column("target_level", Integer, nullable=False),
    Column("revision_number", Integer, nullable=False),
    Column("activity", Text, nullable=False),
    Column("activity_hash", String(64), nullable=False),
    Column("draft_token", String(16), nullable=False),
    Column("rubric_version", String(40), nullable=False),
    Column("rubric_snapshot", document, nullable=False),
    Column("evidence", document, nullable=False),
    Column("target_alignment", Text, nullable=False),
    Column("status", String(24), nullable=False), created(),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("id", "organization_id", "author_id"),
    UniqueConstraint("id", "organization_id", "author_id", "mode", "source_level"),
    UniqueConstraint("organization_id", "author_id", "mode", "source_level", "revision_number"),
    CheckConstraint("source_level BETWEEN 0 AND 8", name="ck_community_activity_level"),
    CheckConstraint("target_level = source_level + 1", name="ck_community_next_clarity"),
    CheckConstraint("revision_number >= 1", name="ck_community_revision_positive"),
    CheckConstraint("mode IN ('fisico','intelectual','emocional','arquetipico','espiritual','romantico','familiar','social','financiero','profesional','ludico','visionario')", name="ck_community_mode"),
    CheckConstraint("status IN ('pending','changes_requested','approved','superseded','withdrawn','stale')", name="ck_community_submission_status"),
    member_reference("author_id"),
)
Index("ix_community_submissions_author", submissions.c.organization_id, submissions.c.author_id, submissions.c.status)

reviews = Table(
    "modocultiva_evidence_reviews", metadata,
    Column("submission_id", String(36), primary_key=True),
    Column("reviewer_id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("decision", String(24), nullable=False),
    Column("activity_match", Boolean, nullable=False),
    Column("effort_match", Boolean, nullable=False),
    Column("clarity_match", Boolean, nullable=False),
    Column("feedback", Text, nullable=False), created(),
    ForeignKeyConstraint(["submission_id", "organization_id", "author_id"], ["modocultiva_evidence_submissions.id", "modocultiva_evidence_submissions.organization_id", "modocultiva_evidence_submissions.author_id"]),
    member_reference("reviewer_id"),
    CheckConstraint("reviewer_id <> author_id", name="ck_community_no_self_review"),
    CheckConstraint("decision IN ('approve','changes_requested')", name="ck_community_review_decision"),
    CheckConstraint("decision <> 'approve' OR (activity_match AND effort_match AND clarity_match)", name="ck_community_all_review_criteria"),
    CheckConstraint("decision <> 'changes_requested' OR length(trim(feedback)) >= 20", name="ck_community_actionable_feedback"),
)
receipts = Table(
    "modocultiva_validation_receipts", metadata,
    Column("submission_id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("reviewer_ids", document, nullable=False),
    Column("advanced", Boolean, nullable=False), created(),
    ForeignKeyConstraint(["submission_id", "organization_id", "author_id"], ["modocultiva_evidence_submissions.id", "modocultiva_evidence_submissions.organization_id", "modocultiva_evidence_submissions.author_id"]),
)
# A source level may advance a mode once, even if someone later lowers their
# self-assessment and tries to replay an old completion or submit another copy.
advance_claims = Table(
    "modocultiva_level_advances", metadata,
    Column("organization_id", String(128), primary_key=True),
    Column("author_id", String(36), primary_key=True),
    Column("mode", String(24), primary_key=True),
    Column("source_level", Integer, primary_key=True),
    Column("submission_id", String(36), nullable=False), created(),
    ForeignKeyConstraint(["submission_id", "organization_id", "author_id", "mode", "source_level"], ["modocultiva_evidence_submissions.id", "modocultiva_evidence_submissions.organization_id", "modocultiva_evidence_submissions.author_id", "modocultiva_evidence_submissions.mode", "modocultiva_evidence_submissions.source_level"]),
    CheckConstraint("source_level BETWEEN 0 AND 8", name="ck_community_advance_activity_level"),
)
notifications = Table(
    "modocultiva_community_notifications", metadata,
    Column("id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("recipient_id", String(36), nullable=False),
    Column("actor_id", String(36), nullable=False),
    Column("kind", String(40), nullable=False),
    Column("resource_id", String(36), nullable=False),
    Column("read", Boolean, nullable=False), created(),
    UniqueConstraint("organization_id", "recipient_id", "kind", "resource_id"),
    member_reference("recipient_id"), member_reference("actor_id"),
)
Index("ix_community_notifications_recipient", notifications.c.organization_id, notifications.c.recipient_id, notifications.c.read)

feed_cards = Table(
    "modocultiva_shared_cards", metadata,
    Column("id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("mode", String(24), nullable=False),
    Column("source_level", Integer, nullable=False),
    Column("activity", Text, nullable=False),
    Column("activity_hash", String(64), nullable=False),
    Column("visible", Boolean, nullable=False), created(),
    UniqueConstraint("id", "organization_id", "author_id"),
    CheckConstraint("source_level BETWEEN 0 AND 8", name="ck_community_share_activity_level"),
    member_reference("author_id"),
)
reactions = Table(
    "modocultiva_shared_reactions", metadata,
    Column("card_id", String(36), primary_key=True),
    Column("user_id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("reaction", String(16), nullable=False), created(),
    ForeignKeyConstraint(["card_id", "organization_id", "author_id"], ["modocultiva_shared_cards.id", "modocultiva_shared_cards.organization_id", "modocultiva_shared_cards.author_id"]),
    member_reference("user_id"),
    CheckConstraint("reaction IN ('leaf','soil','water','sun','roots')", name="ck_community_reaction"),
)
reuse_requests = Table(
    "modocultiva_card_reuse_requests", metadata,
    Column("id", String(36), primary_key=True),
    Column("card_id", String(36), nullable=False),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("requester_id", String(36), nullable=False),
    Column("status", String(20), nullable=False), created(),
    UniqueConstraint("card_id", "requester_id"),
    ForeignKeyConstraint(["card_id", "organization_id", "author_id"], ["modocultiva_shared_cards.id", "modocultiva_shared_cards.organization_id", "modocultiva_shared_cards.author_id"]),
    member_reference("requester_id"),
    CheckConstraint("requester_id <> author_id", name="ck_community_reuse_other"),
    CheckConstraint("status IN ('pending','accepted','declined')", name="ck_community_reuse_status"),
)
idea_requests = Table(
    "modocultiva_local_idea_requests", metadata,
    Column("id", String(36), primary_key=True),
    Column("organization_id", String(128), nullable=False),
    Column("author_id", String(36), nullable=False),
    Column("mode", String(24), nullable=False),
    Column("source_level", Integer, nullable=False),
    Column("status", String(20), nullable=False), created(),
    UniqueConstraint("id", "organization_id", "author_id"),
    CheckConstraint("source_level BETWEEN 0 AND 8", name="ck_community_idea_level"),
    CheckConstraint("status IN ('pending','cancelled')", name="ck_community_idea_status"),
    member_reference("author_id"),
)
idea_offers = Table(
    "modocultiva_local_idea_offers", metadata,
    Column("id", String(36), primary_key=True),
    Column("request_id", String(36), nullable=False),
    Column("organization_id", String(128), nullable=False),
    Column("requester_id", String(36), nullable=False),
    Column("responder_id", String(36), nullable=False),
    Column("activity", Text, nullable=False),
    Column("activity_hash", String(64), nullable=False), created(),
    UniqueConstraint("request_id", "responder_id"),
    ForeignKeyConstraint(["request_id", "organization_id", "requester_id"], ["modocultiva_local_idea_requests.id", "modocultiva_local_idea_requests.organization_id", "modocultiva_local_idea_requests.author_id"]),
    member_reference("responder_id"),
    CheckConstraint("responder_id <> requester_id", name="ck_community_idea_other"),
)

COMMUNITY_TABLES = [progress_controls, profiles, connections, submissions, reviews, receipts, advance_claims, notifications, feed_cards, reactions, reuse_requests, idea_requests, idea_offers]
