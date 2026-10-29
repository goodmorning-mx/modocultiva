"""Authenticated development community; no simulated members or client quorums.

Every evidence writer locks author state before the submission. Review receipts,
completion and conditional one-time advancement commit in the same transaction.
Private media is never projected into directory, feed or notifications.
"""
from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import and_, delete, func, insert, or_, select, update

from app.community_errors import CommunityError
from app.community_media import CommunityMediaStore, check_submission_capacity
from app.community_rules import REVIEW_QUORUM, ReviewInput, SubmissionInput, activity_hash, completion_token, normalize_activity
from app.community_schema import (
    advance_claims, connections, feed_cards, media_assets, metadata, notifications, profiles,
    receipts, reviews, submissions, user_states,
)
from app.community_state import CommunityStateStore, MODES, mapping

MAX_CONNECTION_RECONCILIATIONS = 2 * 12 * 9


def now():
    return datetime.now(timezone.utc)


def fail(code, message, status=409):
    raise CommunityError(code, message, status)


class CommunityService:
    def __init__(self, engine):
        self.engine = engine
        self.states = CommunityStateStore(engine)

    def active(self, connection, actor, org):
        if not CommunityMediaStore.active_member(connection, actor, org):
            fail("member_inactive", "An active authenticated member is required.", 403)

    def profile(self, connection, actor, org, *, require_visible=False):
        row = connection.execute(select(profiles).where(profiles.c.user_id == actor, profiles.c.organization_id == org)).mappings().first()
        if require_visible and (not row or not row["discoverable"]):
            fail("profile_private", "Opt into the member network before sharing with other members.", 403)
        return row

    def connected(self, connection, actor, author, org, *, lock=False):
        if actor == author:
            return False
        low, high = sorted([actor, author])
        query = select(connections).where(connections.c.organization_id == org, connections.c.user_low == low, connections.c.user_high == high, connections.c.status == "accepted")
        if lock:
            query = query.with_for_update()
        return connection.execute(query).mappings().first() is not None

    def eligible(self, connection, actor, author, org, *, lock=False):
        return (actor != author and CommunityMediaStore.active_member(connection, actor, org)
                and CommunityMediaStore.active_member(connection, author, org)
                and bool(self.profile(connection, actor, org))
                and bool(self.profile(connection, author, org))
                and self.profile(connection, actor, org)["discoverable"]
                and self.profile(connection, author, org)["discoverable"]
                and self.connected(connection, actor, author, org, lock=lock))

    def members(self, connection, actor, org):
        rows = connection.execute(select(connections.c.user_low, connections.c.user_high).where(connections.c.organization_id == org, connections.c.status == "accepted", or_(connections.c.user_low == actor, connections.c.user_high == actor))).all()
        return [high if low == actor else low for low, high in rows]

    def eligible_voters(self, connection, identifier, author, org):
        # One statement defines the eligibility instant for the quorum. A later
        # disconnect revokes access, not the validity of an already cast receipt.
        users = metadata.tables["gm_auth_users"]
        voter_user, author_user = users.alias("voter_user"), users.alias("author_user")
        voter_profile, author_profile = profiles.alias("voter_profile"), profiles.alias("author_profile")
        members = metadata.tables["gm_auth_memberships"].alias("voter_membership")
        query = (select(reviews.c.reviewer_id).select_from(reviews)
            .join(voter_user, voter_user.c.id == reviews.c.reviewer_id)
            .join(author_user, author_user.c.id == reviews.c.author_id)
            .join(members, and_(members.c.user_id == reviews.c.reviewer_id, members.c.organization_id == org))
            .join(voter_profile, and_(voter_profile.c.user_id == reviews.c.reviewer_id, voter_profile.c.organization_id == org))
            .join(author_profile, and_(author_profile.c.user_id == author, author_profile.c.organization_id == org))
            .join(connections, and_(connections.c.organization_id == org, connections.c.status == "accepted", or_(
                and_(connections.c.user_low == reviews.c.reviewer_id, connections.c.user_high == author),
                and_(connections.c.user_high == reviews.c.reviewer_id, connections.c.user_low == author))))
            .where(reviews.c.submission_id == identifier, reviews.c.organization_id == org, reviews.c.author_id == author,
                   reviews.c.reviewer_id != author, reviews.c.decision == "approve", reviews.c.activity_match.is_(True), reviews.c.effort_match.is_(True), reviews.c.clarity_match.is_(True),
                   voter_user.c.is_active.is_(True), author_user.c.is_active.is_(True), voter_profile.c.discoverable.is_(True), author_profile.c.discoverable.is_(True)))
        return sorted(set(connection.execute(query).scalars().all()))

    def notify(self, connection, recipient, actor, org, kind, resource):
        # Unique event keys prevent retries from delivering duplicate notices.
        scope = and_(notifications.c.organization_id == org, notifications.c.recipient_id == recipient, notifications.c.kind == kind, notifications.c.resource_id == resource)
        if not connection.execute(select(notifications.c.id).where(scope)).first():
            connection.execute(insert(notifications).values(id=str(uuid4()), organization_id=org, recipient_id=recipient, actor_id=actor, kind=kind, resource_id=resource, read=False))

    def public_profile(self, connection, row, org):
        state = connection.execute(select(user_states.c.state).where(user_states.c.user_id == row["user_id"], user_states.c.organization_id == org)).scalar_one_or_none()
        state = mapping(state)
        levels = {key: value for key, value in mapping(state.get("levels")).items() if key in MODES and type(value) is int and 0 <= value <= 9}
        # No email, arbitrary state JSON, evidence, private maps or saved drafts.
        return {"user_id": row["user_id"], "display_name": row["display_name"], "bio": row["bio"], "levels": levels}

    def set_profile(self, actor, org, display_name, bio, discoverable):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            existing = self.profile(connection, actor, org)
            values = dict(display_name=display_name, bio=bio, discoverable=discoverable)
            if existing:
                connection.execute(update(profiles).where(profiles.c.user_id == actor, profiles.c.organization_id == org).values(**values))
            else:
                connection.execute(insert(profiles).values(user_id=actor, organization_id=org, **values))
            return {"user_id": actor, **values}

    def get_profile(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            row = self.profile(connection, actor, org)
            return {key: row[key] for key in ("user_id", "display_name", "bio", "discoverable")} if row else None

    def directory(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.profile(connection, actor, org, require_visible=True)
            users = metadata.tables["gm_auth_users"]
            rows = connection.execute(select(profiles).join(users, users.c.id == profiles.c.user_id).where(profiles.c.organization_id == org, profiles.c.discoverable.is_(True), users.c.is_active.is_(True), profiles.c.user_id != actor).order_by(profiles.c.display_name, profiles.c.user_id).limit(100)).mappings().all()
            relations = connection.execute(select(connections).where(connections.c.organization_id == org, or_(connections.c.user_low == actor, connections.c.user_high == actor))).mappings().all()
            by_member = {row["user_high"] if row["user_low"] == actor else row["user_low"]: {"id": row["id"], "status": row["status"], "incoming": row["requested_by"] != actor} for row in relations}
            return {"members": [{**self.public_profile(connection, row, org), "connection": by_member.get(row["user_id"])} for row in rows], "limit": 100}

    def request_connection(self, actor, org, member):
        if actor == member:
            fail("self_connection", "Choose another member.", 422)
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.active(connection, member, org)
            self.profile(connection, actor, org, require_visible=True)
            self.profile(connection, member, org, require_visible=True)
            low, high = sorted([actor, member])
            # Serialize invitations to the same unordered pair, including absent
            # pairs, with NO KEY UPDATE on both memberships in stable order.
            # Unlike FOR UPDATE this permits notification foreign-key KEY SHARE
            # checks while acceptance holds the connection row (no lock cycle).
            table = metadata.tables["gm_auth_memberships"]
            connection.execute(select(table.c.user_id).where(table.c.organization_id == org, table.c.user_id.in_([low, high])).order_by(table.c.user_id).with_for_update(key_share=True)).all()
            row = connection.execute(select(connections).where(connections.c.organization_id == org, connections.c.user_low == low, connections.c.user_high == high).with_for_update()).mappings().first()
            if row and row["status"] in {"pending", "accepted"}:
                return {"id": row["id"], "status": row["status"], "incoming": row["requested_by"] != actor}
            identifier = row["id"] if row else str(uuid4())
            values = dict(status="pending", requested_by=actor, updated_at=now())
            if row:
                connection.execute(update(connections).where(connections.c.id == identifier).values(**values))
                # A new invitation is a new event even for a reconnected pair.
                connection.execute(delete(notifications).where(notifications.c.organization_id == org, notifications.c.resource_id == identifier, notifications.c.kind == "connection_request"))
            else:
                connection.execute(insert(connections).values(id=identifier, organization_id=org, user_low=low, user_high=high, **values))
            self.notify(connection, member, actor, org, "connection_request", identifier)
            return {"id": identifier, "status": "pending", "incoming": False}

    def change_connection(self, actor, org, identifier, action):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            row = connection.execute(select(connections).where(connections.c.id == identifier, connections.c.organization_id == org, or_(connections.c.user_low == actor, connections.c.user_high == actor)).with_for_update()).mappings().first()
            if not row:
                fail("connection_not_found", "Connection unavailable.", 404)
            other = row["user_high"] if row["user_low"] == actor else row["user_low"]
            if action in {"accept", "decline"}:
                retry_accept = action == "accept" and row["status"] == "accepted"
                if row["requested_by"] == actor or (row["status"] != "pending" and not retry_accept):
                    fail("connection_not_pending", "Only the invited member can respond to a pending invitation.")
                if action == "accept":
                    self.active(connection, other, org)
                    self.profile(connection, actor, org, require_visible=True)
                    self.profile(connection, other, org, require_visible=True)
                status = "accepted" if action == "accept" else "declined"
            else:
                status = "disconnected"
            connection.execute(update(connections).where(connections.c.id == identifier).values(status=status, updated_at=now()))
            if status == "accepted":
                self.notify(connection, other, actor, org, "connection_accepted", identifier)
            result = {"id": identifier, "status": status}
        # The connection transaction MUST commit before taking any state lock.
        # Existing voters have can_review=false, so reconnect itself reconciles
        # stored votes rather than requiring an inaccessible UI review retry.
        if status == "accepted":
            result["reconciled_submissions"] = self.reconcile_connection(actor, other, org)
        return result

    def reconcile_connection(self, actor, other, org):
        with self.engine.begin() as connection:
            rows = connection.execute(select(submissions.c.id, submissions.c.author_id)
                .join(reviews, (reviews.c.submission_id == submissions.c.id) & (reviews.c.organization_id == org))
                .where(submissions.c.organization_id == org, submissions.c.status == "pending",
                       or_(and_(submissions.c.author_id == actor, reviews.c.reviewer_id == other),
                           and_(submissions.c.author_id == other, reviews.c.reviewer_id == actor)),
                       reviews.c.decision == "approve", reviews.c.activity_match.is_(True),
                       reviews.c.effort_match.is_(True), reviews.c.clarity_match.is_(True))
                .order_by(submissions.c.created_at, submissions.c.id)
                .limit(MAX_CONNECTION_RECONCILIATIONS)).mappings().all()
        completed = 0
        for candidate in rows:
            with self.engine.begin() as connection:
                author = candidate["author_id"]
                reviewer = other if author == actor else actor
                locked = self.states.locked(connection, author, org)
                row = connection.execute(select(submissions).where(submissions.c.id == candidate["id"], submissions.c.organization_id == org).with_for_update()).mappings().first()
                if row and row["status"] == "pending" and self.eligible(connection, reviewer, author, org):
                    completed += self.approve_if_quorum(connection, locked, row, reviewer, org)
        return completed

    def approve_if_quorum(self, connection, locked, row, actor, org):
        """Called only after author-state→submission locks; creates no votes."""
        if row["status"] != "pending":
            return False
        author, identifier = row["author_id"], row["id"]
        activity = mapping(locked.state.get("activityDrafts")).get(f"{row['mode']}-{row['source_level']}")
        if not isinstance(activity, str) or not normalize_activity(activity) or normalize_activity(activity) != normalize_activity(row["activity"]) or activity_hash(activity) != row["activity_hash"]:
            return False
        eligible_voters = self.eligible_voters(connection, identifier, author, org)
        if len(eligible_voters) < REVIEW_QUORUM:
            return False
        proposed = deepcopy(locked.state)
        levels = deepcopy(mapping(proposed.get("levels")))
        claimed = connection.execute(select(advance_claims.c.submission_id).where(advance_claims.c.organization_id == org, advance_claims.c.author_id == author, advance_claims.c.mode == row["mode"], advance_claims.c.source_level == row["source_level"])).first()
        advanced = not claimed and type(levels.get(row["mode"])) is int and levels[row["mode"]] == row["source_level"]
        if advanced:
            connection.execute(insert(advance_claims).values(organization_id=org, author_id=author, mode=row["mode"], source_level=row["source_level"], submission_id=identifier))
            proposed["levels"] = {**levels, row["mode"]: row["target_level"]}
        connection.execute(insert(receipts).values(submission_id=identifier, organization_id=org, author_id=author, reviewer_ids=eligible_voters, advanced=bool(advanced)))
        connection.execute(update(submissions).where(submissions.c.id == identifier).values(status="approved", updated_at=now()))
        self.states.write_locked(connection, locked, proposed)
        self.notify(connection, author, actor, org, "evidence_validated", identifier)
        return True

    def submission_dto(self, connection, row, actor, org, *, evidence=True):
        votes = connection.execute(select(reviews.c.reviewer_id, reviews.c.decision, reviews.c.activity_match, reviews.c.effort_match, reviews.c.clarity_match, reviews.c.feedback, reviews.c.created_at).where(reviews.c.submission_id == row["id"], reviews.c.organization_id == org).order_by(reviews.c.created_at)).mappings().all()
        receipt = connection.execute(select(receipts).where(receipts.c.submission_id == row["id"], receipts.c.organization_id == org)).mappings().first()
        valid_votes = [vote for vote in votes if vote["decision"] == "approve" and (vote["reviewer_id"] in receipt["reviewer_ids"] if receipt else self.eligible(connection, vote["reviewer_id"], row["author_id"], org))]
        result = {key: row[key] for key in ("id", "author_id", "mode", "source_level", "target_level", "revision_number", "activity", "activity_hash", "rubric_version", "rubric_snapshot", "target_alignment", "status", "created_at")}
        result.update(review_count=len(valid_votes), review_quorum=REVIEW_QUORUM, reviews=[dict(vote) for vote in votes], can_review=row["status"] == "pending" and actor != row["author_id"] and not any(vote["reviewer_id"] == actor for vote in votes) and self.eligible(connection, actor, row["author_id"], org), advanced=bool(receipt and receipt["advanced"]))
        if evidence:
            result["evidence"] = row["evidence"]
        card = connection.execute(select(feed_cards.c.id, feed_cards.c.audience).where(feed_cards.c.submission_id == row["id"], feed_cards.c.author_id == row["author_id"], feed_cards.c.organization_id == org, feed_cards.c.visible.is_(True)).order_by(feed_cards.c.created_at.desc(), feed_cards.c.id).limit(1)).mappings().first()
        result["audience"] = card["audience"] if card else "network"
        if card:
            result["shared_card_id"] = card["id"]
        return result

    def publish_card(self, connection, actor, org, mode, level, activity, digest, audience, submission_id):
        """Explicit publication, always under author state lock and same transaction."""
        card = connection.execute(select(feed_cards).where(
            feed_cards.c.author_id == actor, feed_cards.c.organization_id == org,
            feed_cards.c.mode == mode, feed_cards.c.source_level == level,
            feed_cards.c.activity_hash == digest, feed_cards.c.visible.is_(True))
            .order_by(feed_cards.c.created_at.desc(), feed_cards.c.id).limit(1).with_for_update()).mappings().first()
        values = dict(audience=audience, submission_id=submission_id)
        identifier = card["id"] if card else str(uuid4())
        if card:
            connection.execute(update(feed_cards).where(feed_cards.c.id == identifier).values(**values))
        else:
            connection.execute(insert(feed_cards).values(id=identifier, organization_id=org, author_id=actor, mode=mode, source_level=level, activity=normalize_activity(activity), activity_hash=digest, visible=True, **values))
        return connection.execute(select(feed_cards).where(feed_cards.c.id == identifier)).mappings().one()

    def submit(self, actor, org, payload: SubmissionInput):
        if payload.audience == "public" and payload.public_confirmed is not True:
            fail("public_confirmation_required", "Explicit public confirmation is required.", 422)
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.profile(connection, actor, org, require_visible=True)
            locked = self.states.locked(connection, actor, org)
            activity = mapping(locked.state.get("activityDrafts")).get(f"{payload.mode}-{payload.level}")
            if not isinstance(activity, str) or not normalize_activity(activity) or len(activity) > 12_000 or activity_hash(activity) != payload.expected_activity_hash:
                fail("activity_changed", "Save the exact activity before attaching its evidence.")
            evidence = payload.evidence.model_dump(mode="json", exclude_none=True)
            if payload.evidence.video_asset_id:
                asset = connection.execute(select(media_assets.c.id, media_assets.c.mime_type, media_assets.c.byte_size, media_assets.c.sha256).where(media_assets.c.id == str(payload.evidence.video_asset_id), media_assets.c.author_id == actor, media_assets.c.organization_id == org)).mappings().first()
                if not asset:
                    fail("video_not_owned", "Attach an actual private video uploaded by this account.", 422)
                evidence["video"] = dict(asset)
            old = connection.execute(select(submissions).where(submissions.c.author_id == actor, submissions.c.organization_id == org, submissions.c.mode == payload.mode, submissions.c.source_level == payload.level).order_by(submissions.c.revision_number.desc()).limit(1).with_for_update()).mappings().first()
            if old and old["status"] == "pending" and old["activity_hash"] == payload.expected_activity_hash and old["evidence"] == evidence and old["target_alignment"] == payload.target_alignment:
                self.publish_card(connection, actor, org, payload.mode, payload.level, activity, payload.expected_activity_hash, payload.audience, old["id"])
                return self.submission_dto(connection, old, actor, org)
            if old and old["status"] == "approved" and old["activity_hash"] == payload.expected_activity_hash:
                fail("already_validated", "This exact activity is already validated.")
            # Exact retry deduplication above costs no new capacity. All retained
            # revisions, not just pending ones, consume budget/rate below.
            check_submission_capacity(connection, actor, org, evidence)
            if old and old["status"] in {"pending", "changes_requested"}:
                connection.execute(update(submissions).where(submissions.c.id == old["id"]).values(status="superseded", updated_at=now()))
            rubric = payload.rubric()
            identifier = str(uuid4())
            values = dict(id=identifier, organization_id=org, author_id=actor, mode=payload.mode, source_level=payload.level, target_level=payload.level + 1, revision_number=old["revision_number"] + 1 if old else 1, activity=normalize_activity(activity), activity_hash=payload.expected_activity_hash, draft_token=completion_token(activity), rubric_version=rubric["version"], rubric_snapshot=rubric, evidence=evidence, target_alignment=payload.target_alignment, status="pending", updated_at=now())
            connection.execute(insert(submissions).values(**values))
            self.publish_card(connection, actor, org, payload.mode, payload.level, activity, payload.expected_activity_hash, payload.audience, identifier)
            for member in self.members(connection, actor, org):
                if self.eligible(connection, member, actor, org):
                    self.notify(connection, member, actor, org, "evidence_ready", identifier)
            row = connection.execute(select(submissions).where(submissions.c.id == identifier)).mappings().one()
            return self.submission_dto(connection, row, actor, org)

    def own_submissions(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            rows = connection.execute(select(submissions).where(submissions.c.author_id == actor, submissions.c.organization_id == org).order_by(submissions.c.created_at.desc(), submissions.c.revision_number.desc()).limit(200)).mappings().all()
            return {"submissions": [self.submission_dto(connection, row, actor, org) for row in rows]}

    def inbox(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            if not self.profile(connection, actor, org) or not self.profile(connection, actor, org)["discoverable"]:
                return {"submissions": []}
            members = self.members(connection, actor, org)
            rows = connection.execute(select(submissions).where(submissions.c.organization_id == org, submissions.c.author_id.in_(members), submissions.c.status == "pending").order_by(submissions.c.created_at).limit(50)).mappings().all()
            return {"submissions": [self.submission_dto(connection, row, actor, org) for row in rows if self.eligible(connection, actor, row["author_id"], org)]}

    def read_submission(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            row = connection.execute(select(submissions).where(submissions.c.id == identifier, submissions.c.organization_id == org)).mappings().first()
            if not row or (row["author_id"] != actor and (row["status"] not in {"pending", "changes_requested", "approved"} or not self.eligible(connection, actor, row["author_id"], org))):
                fail("submission_not_found", "Evidence unavailable to this member.", 404)
            return self.submission_dto(connection, row, actor, org)

    def withdraw(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            row = connection.execute(select(submissions).where(submissions.c.id == identifier, submissions.c.organization_id == org, submissions.c.author_id == actor).with_for_update()).mappings().first()
            if not row:
                fail("submission_not_found", "Submission unavailable.", 404)
            if row["status"] == "approved":
                fail("already_validated", "A completed receipt remains in history; disconnect or opt out to revoke future private access.")
            connection.execute(update(submissions).where(submissions.c.id == identifier).values(status="withdrawn", updated_at=now()))
            return {"id": identifier, "status": "withdrawn"}

    def review(self, actor, org, identifier, payload: ReviewInput):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            author = connection.execute(select(submissions.c.author_id).where(submissions.c.id == identifier, submissions.c.organization_id == org)).scalar_one_or_none()
            if not author or not self.eligible(connection, actor, author, org):
                fail("review_forbidden", "Only another active connected member may review this evidence.", 403)
            locked = self.states.locked(connection, author, org)
            row = connection.execute(select(submissions).where(submissions.c.id == identifier, submissions.c.organization_id == org).with_for_update()).mappings().one()
            if not self.eligible(connection, actor, author, org):
                fail("review_forbidden", "This connection is no longer eligible.", 403)
            if row["activity_hash"] != payload.expected_activity_hash:
                fail("activity_changed", "Review the exact activity revision currently displayed.")
            previous = connection.execute(select(reviews).where(reviews.c.submission_id == identifier, reviews.c.reviewer_id == actor)).mappings().first()
            if previous:
                if any(previous[key] != value for key, value in payload.model_dump(exclude={"expected_activity_hash"}).items()):
                    fail("already_reviewed", "A member may review this immutable revision only once.")
                if row["status"] != "pending":
                    return self.submission_dto(connection, row, actor, org)
            if row["status"] != "pending":
                fail("revision_closed", "This revision is no longer awaiting reviews.")
            activity = mapping(locked.state.get("activityDrafts")).get(f"{row['mode']}-{row['source_level']}")
            if not isinstance(activity, str) or not normalize_activity(activity) or normalize_activity(activity) != normalize_activity(row["activity"]) or activity_hash(activity) != row["activity_hash"]:
                fail("activity_changed", "The author changed the activity. Fresh evidence is required.")
            if not previous:
                connection.execute(insert(reviews).values(submission_id=identifier, reviewer_id=actor, organization_id=org, author_id=author, **payload.model_dump(exclude={"expected_activity_hash"})))
            status = "pending"
            if payload.decision == "changes_requested":
                status = "changes_requested"
                self.notify(connection, author, actor, org, "evidence_changes", identifier)
            else:
                if self.approve_if_quorum(connection, locked, row, actor, org):
                    status = "approved"
                else:
                    self.notify(connection, author, actor, org, "evidence_review", identifier)
            if status != "approved":
                connection.execute(update(submissions).where(submissions.c.id == identifier).values(status=status, updated_at=now()))
            row = connection.execute(select(submissions).where(submissions.c.id == identifier)).mappings().one()
            return self.submission_dto(connection, row, actor, org)

    def notices(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            rows = connection.execute(select(notifications.c.id, notifications.c.kind, notifications.c.resource_id, notifications.c.read, notifications.c.created_at).where(notifications.c.organization_id == org, notifications.c.recipient_id == actor).order_by(notifications.c.created_at.desc()).limit(100)).mappings().all()
            return {"notifications": [dict(row) for row in rows]}

    def mark_notice(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            result = connection.execute(update(notifications).where(notifications.c.id == identifier, notifications.c.organization_id == org, notifications.c.recipient_id == actor).values(read=True))
            if not result.rowcount:
                fail("notice_not_found", "Notification unavailable.", 404)
            return {"id": identifier, "read": True}
