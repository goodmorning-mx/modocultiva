"""Protected product-state transactions used by the community and state APIs.

The integrated revision-aware client reconciles queued saves after a conflict.
All writers lock the author's state before submissions; a stale full-state
autosave cannot overwrite an approval/advance. Receipts are server-owned.
"""
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import re
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert

from app.community_rules import activity_hash, completion_token, normalize_activity
from app.community_schema import progress_controls, receipts, reviews, submissions, user_states

MODES = {"fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"}
SERVER_FIELDS = {"validationReceipts", "legacyCompletionSlots", "communityApprovals"}
MERGED_FIELDS = ("levels", "presets", "activityDrafts", "activityAlignments", "activityCompletions", "activityReactions", "insightRequests", "visionImages")


def mapping(value) -> dict:
    return value if isinstance(value, dict) else {}


def valid_slot(slot) -> bool:
    return isinstance(slot, str) and any(slot == f"{mode}-{level}" for mode in MODES for level in range(10))


@dataclass
class LockedState:
    user_id: str
    organization_id: str
    state: dict
    revision: str
    legacy_snapshot: dict


@dataclass
class StateSnapshot:
    state: dict
    revision: str
    validation_receipts: dict
    legacy_completion_slots: list[str]

    def payload(self) -> dict:
        return {"state": self.state, "revision": self.revision,
                "validationReceipts": self.validation_receipts,
                "legacyCompletionSlots": self.legacy_completion_slots}


class StateConflict(Exception):
    def __init__(self, snapshot: StateSnapshot):
        super().__init__("The saved map changed. Reconcile with its current revision before retrying.")
        self.snapshot = snapshot


def merge_device_document(device: dict, cloud: dict) -> dict:
    """Preserve the existing cloud-wins per-key device-import contract."""
    result = {**deepcopy(device), **deepcopy(cloud)}
    for field in MERGED_FIELDS:
        if field in device or field in cloud:
            result[field] = {**deepcopy(mapping(device.get(field))), **deepcopy(mapping(cloud.get(field)))}
    if "featuredBadges" in device or "featuredBadges" in cloud:
        values = []
        for source in (cloud.get("featuredBadges"), device.get("featuredBadges")):
            if isinstance(source, list):
                for value in source:
                    if value not in values:
                        values.append(deepcopy(value))
        result["featuredBadges"] = values
    return result


class CommunityStateStore:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def scope(table, user_id, organization_id):
        return (table.c.user_id == user_id) & (table.c.organization_id == organization_id)

    @staticmethod
    def insert_missing(connection, table, values):
        factory = pg_insert if connection.dialect.name == "postgresql" else sqlite_insert if connection.dialect.name == "sqlite" else None
        if factory is None:
            raise RuntimeError("Protected state supports PostgreSQL and the isolated SQLite test adapter.")
        connection.execute(factory(table).values(**values).on_conflict_do_nothing(index_elements=["user_id", "organization_id"]))

    def locked(self, connection, user_id: str, organization_id: str) -> LockedState:
        self.insert_missing(connection, user_states, {"user_id": user_id, "organization_id": organization_id, "state": {}, "updated_at": datetime.now(timezone.utc)})
        # Uniform state→control→submission lock order, also used by reviews.
        row = connection.execute(select(user_states.c.state).where(self.scope(user_states, user_id, organization_id)).with_for_update()).mappings().one()
        if not isinstance(row["state"], dict):
            raise ValueError("Existing state is not an object; it was preserved, not reset.")
        self.insert_missing(connection, progress_controls, {
            "user_id": user_id, "organization_id": organization_id, "revision": str(uuid4()),
            "legacy_snapshot": {"activityDrafts": deepcopy(mapping(row["state"].get("activityDrafts"))), "activityCompletions": deepcopy(mapping(row["state"].get("activityCompletions")))},
        })
        control = connection.execute(select(progress_controls).where(self.scope(progress_controls, user_id, organization_id)).with_for_update()).mappings().one()
        return LockedState(user_id, organization_id, deepcopy(row["state"]), control["revision"], deepcopy(control["legacy_snapshot"]))

    def snapshot(self, connection, locked: LockedState, proposed: dict | None = None) -> StateSnapshot:
        state = deepcopy(locked.state if proposed is None else proposed)
        for field in SERVER_FIELDS:
            state.pop(field, None)
        drafts = mapping(state.get("activityDrafts"))
        history = mapping(locked.legacy_snapshot)
        old_drafts, old_ledger = mapping(history.get("activityDrafts")), mapping(history.get("activityCompletions"))
        ledger, historical, verified = {}, [], {}
        for slot, token in old_ledger.items():
            activity, old_activity = drafts.get(slot), old_drafts.get(slot)
            if not valid_slot(slot) or not isinstance(token, str) or not re.fullmatch(r"[0-9a-f]{16}", token):
                continue
            if not isinstance(activity, str) or not normalize_activity(activity) or not isinstance(old_activity, str) or normalize_activity(activity) != normalize_activity(old_activity) or token != completion_token(activity):
                continue
            ledger[slot] = token
            if not slot.endswith("-9"):
                historical.append(slot)
        rows = connection.execute(select(
            submissions.c.id, submissions.c.mode, submissions.c.source_level,
            submissions.c.activity, submissions.c.activity_hash, submissions.c.draft_token,
            receipts.c.reviewer_ids, receipts.c.advanced, receipts.c.created_at,
        ).join(receipts, (receipts.c.submission_id == submissions.c.id) & (receipts.c.organization_id == submissions.c.organization_id) & (receipts.c.author_id == submissions.c.author_id))
            .where(submissions.c.author_id == locked.user_id, submissions.c.organization_id == locked.organization_id, submissions.c.status == "approved")
            .order_by(receipts.c.created_at)).mappings().all()
        approvals = {}
        for vote in connection.execute(select(reviews.c.submission_id, reviews.c.reviewer_id)
            .where(reviews.c.organization_id == locked.organization_id, reviews.c.author_id == locked.user_id,
                   reviews.c.decision == "approve", reviews.c.activity_match.is_(True), reviews.c.effort_match.is_(True), reviews.c.clarity_match.is_(True))).mappings():
            approvals.setdefault(vote["submission_id"], set()).add(vote["reviewer_id"])
        for row in rows:
            slot = f"{row['mode']}-{row['source_level']}"
            activity = drafts.get(slot)
            reviewer_ids = row["reviewer_ids"]
            # Defense in depth: only an actual independent quorum receipt may
            # appear as peer-validated, regardless of a forged client JSON field.
            if not isinstance(reviewer_ids, list) or not all(isinstance(value, str) and value for value in reviewer_ids) or len(set(reviewer_ids)) < 3 or locked.user_id in reviewer_ids:
                continue
            if not set(reviewer_ids).issubset(approvals.get(row["id"], set())):
                continue
            if not isinstance(activity, str) or not normalize_activity(activity) or normalize_activity(activity) != normalize_activity(row["activity"]) or activity_hash(activity) != row["activity_hash"] or completion_token(activity) != row["draft_token"]:
                continue
            ledger[slot] = row["draft_token"]
            verified[slot] = {"submissionId": row["id"], "activityHash": row["activity_hash"], "reviewerCount": len(set(reviewer_ids)), "advanced": row["advanced"], "completedAt": row["created_at"].isoformat()}
            if slot in historical:
                historical.remove(slot)
        state["activityCompletions"] = ledger
        return StateSnapshot(state, locked.revision, verified, sorted(historical))

    def load(self, user_id: str, organization_id: str) -> StateSnapshot:
        with self.engine.begin() as connection:
            return self.snapshot(connection, self.locked(connection, user_id, organization_id))

    def write_locked(self, connection, locked: LockedState, proposed: dict) -> StateSnapshot:
        now = datetime.now(timezone.utc)
        pending = connection.execute(select(submissions.c.id, submissions.c.mode, submissions.c.source_level, submissions.c.activity_hash)
            .where(submissions.c.author_id == locked.user_id, submissions.c.organization_id == locked.organization_id, submissions.c.status.in_(["pending", "changes_requested"])).with_for_update()).mappings().all()
        drafts = mapping(proposed.get("activityDrafts"))
        for row in pending:
            activity = drafts.get(f"{row['mode']}-{row['source_level']}")
            if not isinstance(activity, str) or not normalize_activity(activity) or activity_hash(activity) != row["activity_hash"]:
                connection.execute(update(submissions).where(submissions.c.id == row["id"], submissions.c.organization_id == locked.organization_id).values(status="stale", updated_at=now))
        snapshot = self.snapshot(connection, locked, proposed)
        revision = str(uuid4())
        connection.execute(update(user_states).where(self.scope(user_states, locked.user_id, locked.organization_id)).values(state=snapshot.state, updated_at=now))
        connection.execute(update(progress_controls).where(self.scope(progress_controls, locked.user_id, locked.organization_id)).values(revision=revision))
        snapshot.revision = revision
        return snapshot

    def save(self, user_id: str, organization_id: str, incoming: dict, expected_revision: str | None) -> StateSnapshot:
        if not isinstance(incoming, dict):
            raise ValueError("A map must be a JSON object.")
        with self.engine.begin() as connection:
            locked = self.locked(connection, user_id, organization_id)
            if not expected_revision or expected_revision != locked.revision:
                conflict = StateConflict(self.snapshot(connection, locked))
            else:
                # Missing top-level fields are preserved for old clients.
                # Explicit empties remain intentional, revision-guarded edits.
                proposed = {**deepcopy(locked.state), **deepcopy(incoming)}
                if "levels" in incoming and isinstance(incoming["levels"], dict):
                    proposed["levels"] = {**deepcopy(mapping(locked.state.get("levels"))), **deepcopy(incoming["levels"])}
                return self.write_locked(connection, locked, proposed)
        # Commit a newly bootstrapped revision before returning a conflict, so
        # retrying that revision works even if an old client never loaded first.
        raise conflict

    def merge_device(self, user_id: str, organization_id: str, device: dict) -> StateSnapshot:
        with self.engine.begin() as connection:
            locked = self.locked(connection, user_id, organization_id)
            proposed = merge_device_document(device, locked.state)
            # Only the server-captured baseline (including migration001) grants
            # legacy credit. Device claims are retained separately, never fed
            # into snapshot()'s baseline ledger, even on the first merge.
            history = deepcopy(mapping(locked.legacy_snapshot))
            device_history = {field: deepcopy(mapping(device.get(field))) for field in ("activityDrafts", "activityAlignments", "activityCompletions")}
            history["unverifiedDeviceHistory"] = merge_device_document(device_history, mapping(history.get("unverifiedDeviceHistory")))
            history["deviceImported"] = True
            locked.legacy_snapshot = history
            connection.execute(update(progress_controls).where(self.scope(progress_controls, user_id, organization_id)).values(legacy_snapshot=history))
            return self.write_locked(connection, locked, proposed)
