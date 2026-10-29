"""Explicit network/public card audiences; safe detail projection and network reuse."""
from copy import deepcopy
from urllib.parse import urlsplit
from uuid import uuid4

from sqlalchemy import delete, insert, or_, select, update

from app.community_rules import REVIEW_QUORUM, activity_hash, normalize_activity, validate_evidence_png
from app.community_media import CommunityMediaStore, MAX_VIDEO_BYTES
from app.community_schema import feed_cards, idea_offers, idea_requests, media_assets, reactions, receipts, reuse_requests, submissions, user_states
from app.community_service import CommunityService, fail
from app.community_state import mapping


class CommunitySharingService(CommunityService):
    def current_card_activity(self, connection, card):
        """Text-only publication grants no access to an unselected submission."""
        state = connection.execute(select(user_states.c.state).where(user_states.c.organization_id == card["organization_id"], user_states.c.user_id == card["author_id"])).scalar_one_or_none()
        activity = mapping(mapping(state).get("activityDrafts")).get(f"{card['mode']}-{card['source_level']}")
        shared = card["activity"]
        return bool(isinstance(activity, str) and isinstance(shared, str) and normalize_activity(activity)
                    and normalize_activity(activity) == normalize_activity(shared)
                    and activity_hash(activity) == card["activity_hash"] == activity_hash(shared))

    def linked_proof(self, connection, card):
        if not card["submission_id"]:
            return None
        org, author = card["organization_id"], card["author_id"]
        row = connection.execute(select(submissions).where(submissions.c.id == card["submission_id"], submissions.c.organization_id == org, submissions.c.author_id == author)).mappings().first()
        if not row or row["status"] not in {"pending", "changes_requested", "approved"} or row["mode"] != card["mode"] or row["source_level"] != card["source_level"] or row["activity_hash"] != card["activity_hash"] or normalize_activity(row["activity"]) != normalize_activity(card["activity"]):
            return None
        latest = connection.execute(select(submissions.c.id).where(submissions.c.organization_id == org, submissions.c.author_id == author, submissions.c.mode == row["mode"], submissions.c.source_level == row["source_level"]).order_by(submissions.c.revision_number.desc()).limit(1)).scalar_one_or_none()
        state = connection.execute(select(user_states.c.state).where(user_states.c.organization_id == org, user_states.c.user_id == author)).scalar_one_or_none()
        activity = mapping(mapping(state).get("activityDrafts")).get(f"{row['mode']}-{row['source_level']}")
        if latest != row["id"] or not isinstance(activity, str) or not normalize_activity(activity) or activity_hash(activity) != row["activity_hash"]:
            return None
        evidence = mapping(row["evidence"])
        image, video_id = evidence.get("image"), evidence.get("video_asset_id")
        if bool(image) == bool(video_id):
            return None
        asset = None
        if image:
            try:
                validate_evidence_png(image)
            except (ValueError, TypeError, AttributeError):
                return None
        else:
            asset = connection.execute(select(media_assets.c.id, media_assets.c.mime_type, media_assets.c.byte_size).where(media_assets.c.id == str(video_id), media_assets.c.organization_id == org, media_assets.c.author_id == author)).mappings().first()
            if not asset or asset["mime_type"] not in {"video/mp4", "video/webm"} or not 0 < asset["byte_size"] <= MAX_VIDEO_BYTES:
                return None
        return row, asset

    def public_card_allowed(self, connection, row, proof):
        profile = self.profile(connection, row["author_id"], row["organization_id"])
        current_content = bool(proof) if row["submission_id"] else self.current_card_activity(connection, row)
        return bool(row["visible"] and row["audience"] == "public" and current_content and profile and profile["discoverable"] and CommunityMediaStore.active_member(connection, row["author_id"], row["organization_id"]))

    def _card(self, connection, actor, org, identifier, *, owner=False, network_only=False):
        row = connection.execute(select(feed_cards).where(feed_cards.c.id == identifier, feed_cards.c.organization_id == org, feed_cards.c.visible.is_(True))).mappings().first()
        if not row or (row["author_id"] != actor and (owner or (not self.eligible(connection, actor, row["author_id"], org) and (network_only or not self.public_card_allowed(connection, row, self.linked_proof(connection, row)))))):
            fail("card_not_found", "Shared activity unavailable.", 404)
        return row

    def card_dto(self, connection, row, actor, org):
        votes = connection.execute(select(reactions.c.user_id, reactions.c.reaction).where(reactions.c.card_id == row["id"], reactions.c.organization_id == org)).all()
        totals = {key: 0 for key in ("leaf", "soil", "water", "sun", "roots")}
        for _, reaction in votes:
            totals[reaction] += 1
        permission = connection.execute(select(reuse_requests.c.id, reuse_requests.c.status).where(reuse_requests.c.card_id == row["id"], reuse_requests.c.requester_id == actor, reuse_requests.c.organization_id == org)).mappings().first() if actor and self.eligible(connection, actor, row["author_id"], org) else None
        profile = self.profile(connection, row["author_id"], org)
        return {**{key: row[key] for key in ("id", "author_id", "mode", "source_level", "activity", "activity_hash", "created_at")},
                "display_name": profile["display_name"] if profile else "", "reactions": totals,
                "my_reaction": next((reaction for voter, reaction in votes if voter == actor), None), "reuse": dict(permission) if permission else None,
                "audience": row["audience"], "has_evidence": bool(row["submission_id"])}

    def _detail_access(self, connection, identifier, actor=None, org=None, *, public_only=False):
        row = connection.execute(select(feed_cards).where(feed_cards.c.id == identifier, feed_cards.c.visible.is_(True))).mappings().first()
        if not row:
            fail("card_not_found", "Card unavailable.", 404)
        proof = self.linked_proof(connection, row)
        network = False
        if actor is not None and not public_only:
            self.active(connection, actor, org)
            network = row["organization_id"] == org and (row["author_id"] == actor or self.eligible(connection, actor, row["author_id"], org))
        if (row["submission_id"] and not proof) or (not network and not self.public_card_allowed(connection, row, proof)):
            fail("card_not_found", "Card unavailable.", 404)
        return row, proof

    def card_detail(self, identifier, actor=None, org=None, *, public_only=False):
        with self.engine.begin() as connection:
            card, proof = self._detail_access(connection, identifier, actor, org, public_only=public_only)
            own_org_actor = actor if not public_only and card["organization_id"] == org else None
            result = self.card_dto(connection, card, own_org_actor, card["organization_id"])
            result.update(review_count=0, review_quorum=REVIEW_QUORUM)
            if proof:
                row, asset = proof
                evidence = mapping(row["evidence"])
                result["proof"] = {"kind": "video", "mime_type": asset["mime_type"], "byte_size": asset["byte_size"]} if asset else {"kind": "photo", "image": evidence["image"]}
                result["reflection"] = str(evidence.get("reflection", ""))[:6000]
                link = evidence.get("link")
                try:
                    parsed = urlsplit(link) if isinstance(link, str) else None
                    if parsed and parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password:
                        result["reference_link"] = link
                except ValueError:
                    pass
                rubric = mapping(row["rubric_snapshot"])
                result["rubric_snapshot"] = {key: rubric[key] for key in ("version", "effort") if key in rubric}
                for key in ("source", "target"):
                    result["rubric_snapshot"][key] = {field: mapping(rubric.get(key))[field] for field in ("level", "name", "description") if field in mapping(rubric.get(key))}
                result.update(target_alignment=row["target_alignment"], validation_status=row["status"])
                receipt = connection.execute(select(receipts.c.reviewer_ids).where(receipts.c.submission_id == row["id"], receipts.c.organization_id == card["organization_id"], receipts.c.author_id == card["author_id"])).scalar_one_or_none()
                result["review_count"] = len(set(receipt)) if isinstance(receipt, list) else len(self.eligible_voters(connection, row["id"], card["author_id"], card["organization_id"]))
            return result

    def card_video(self, identifier, actor=None, org=None, *, public_only=False):
        with self.engine.begin() as connection:
            card, proof = self._detail_access(connection, identifier, actor, org, public_only=public_only)
            if not proof or not proof[1]:
                fail("media_not_found", "This card has no available video.", 404)
            asset = connection.execute(select(media_assets).where(media_assets.c.id == proof[1]["id"], media_assets.c.organization_id == card["organization_id"], media_assets.c.author_id == card["author_id"])).mappings().one()
            if len(asset["content"]) != asset["byte_size"] or not 0 < len(asset["content"]) <= MAX_VIDEO_BYTES:
                fail("media_not_found", "Uploaded evidence unavailable.", 404)
            return dict(asset)

    def change_audience(self, actor, org, identifier, payload):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            card = self._card(connection, actor, org, identifier, owner=True)
            if payload.audience == "public":
                if payload.public_confirmed is not True:
                    fail("public_confirmation_required", "Explicit public confirmation is required.", 422)
                self.profile(connection, actor, org, require_visible=True)
                if card["submission_id"]:
                    if not self.linked_proof(connection, card):
                        fail("submission_not_current", "This linked evidence is no longer current.", 422)
                elif not self.current_card_activity(connection, card):
                    fail("activity_changed", "Save and share the exact current activity before publishing it.")
            connection.execute(update(feed_cards).where(feed_cards.c.id == identifier).values(audience=payload.audience))
            return self.card_dto(connection, {**dict(card), "audience": payload.audience}, actor, org)

    def share(self, actor, org, payload):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.profile(connection, actor, org, require_visible=True)
            locked = self.states.locked(connection, actor, org)
            activity = mapping(locked.state.get("activityDrafts")).get(f"{payload.mode}-{payload.level}")
            if not isinstance(activity, str) or not normalize_activity(activity) or len(activity) > 12_000 or activity_hash(activity) != payload.expected_activity_hash:
                fail("activity_changed", "Save the exact activity before sharing it.")
            if payload.audience == "public" and payload.public_confirmed is not True:
                fail("public_confirmation_required", "Explicit public confirmation is required.", 422)
            submission_id = str(payload.submission_id) if payload.submission_id else None
            if submission_id:
                candidate = dict(submission_id=submission_id, organization_id=org, author_id=actor, mode=payload.mode, source_level=payload.level, activity_hash=payload.expected_activity_hash, activity=activity)
                if not self.linked_proof(connection, candidate):
                    fail("submission_not_current", "Choose the current matching evidence owned by this account.", 422)
            row = self.publish_card(connection, actor, org, payload.mode, payload.level, activity, payload.expected_activity_hash, payload.audience, submission_id)
            return self.card_dto(connection, row, actor, org)

    def feed(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            if not self.profile(connection, actor, org) or not self.profile(connection, actor, org)["discoverable"]:
                return {"cards": []}
            authors = [actor, *self.members(connection, actor, org)]
            rows = connection.execute(select(feed_cards).where(feed_cards.c.organization_id == org, or_(feed_cards.c.author_id.in_(authors), feed_cards.c.audience == "public"), feed_cards.c.visible.is_(True)).order_by(feed_cards.c.created_at.desc()).limit(100)).mappings().all()
            cards = []
            for row in rows:
                proof = self.linked_proof(connection, row)
                if row["submission_id"] and not proof:
                    continue
                if row["author_id"] == actor or self.eligible(connection, actor, row["author_id"], org) or self.public_card_allowed(connection, row, proof):
                    cards.append(self.card_dto(connection, row, actor, org))
            return {"cards": cards}

    def react(self, actor, org, identifier, reaction):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.profile(connection, actor, org, require_visible=True)
            self.states.locked(connection, actor, org)
            card = self._card(connection, actor, org, identifier)
            scope = (reactions.c.card_id == identifier) & (reactions.c.user_id == actor) & (reactions.c.organization_id == org)
            connection.execute(delete(reactions).where(scope))
            if reaction is not None:
                connection.execute(insert(reactions).values(card_id=identifier, user_id=actor, organization_id=org, author_id=card["author_id"], reaction=reaction))
            return self.card_dto(connection, card, actor, org)

    def hide_card(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            card = self._card(connection, actor, org, identifier, owner=True)
            connection.execute(update(feed_cards).where(feed_cards.c.id == card["id"]).values(visible=False))
            return {"id": identifier, "visible": False}

    def request_reuse(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            card = self._card(connection, actor, org, identifier, network_only=True)
            if card["author_id"] == actor:
                fail("self_reuse", "Ask another member to reuse their activity.", 422)
            row = connection.execute(select(reuse_requests).where(reuse_requests.c.card_id == identifier, reuse_requests.c.requester_id == actor, reuse_requests.c.organization_id == org)).mappings().first()
            if row:
                return {"id": row["id"], "status": row["status"]}
            request_id = str(uuid4())
            connection.execute(insert(reuse_requests).values(id=request_id, card_id=identifier, organization_id=org, author_id=card["author_id"], requester_id=actor, status="pending"))
            self.notify(connection, card["author_id"], actor, org, "reuse_requested", request_id)
            return {"id": request_id, "status": "pending"}

    def reuse_list(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            rows = connection.execute(select(reuse_requests).where(reuse_requests.c.organization_id == org, or_(reuse_requests.c.author_id == actor, reuse_requests.c.requester_id == actor)).order_by(reuse_requests.c.created_at.desc()).limit(100)).mappings().all()
            result = []
            for row in rows:
                other = row["author_id"] if row["requester_id"] == actor else row["requester_id"]
                if not self.eligible(connection, actor, other, org):
                    continue
                card = connection.execute(select(feed_cards).where(feed_cards.c.id == row["card_id"], feed_cards.c.visible.is_(True))).mappings().first()
                if card:
                    result.append({**{key: row[key] for key in ("id", "card_id", "author_id", "requester_id", "status")}, "display_name": self.profile(connection, other, org)["display_name"], "mode": card["mode"], "source_level": card["source_level"], "activity": card["activity"]})
            return {"requests": result}

    def respond_reuse(self, actor, org, identifier, action):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            row = connection.execute(select(reuse_requests).where(reuse_requests.c.id == identifier, reuse_requests.c.organization_id == org, reuse_requests.c.author_id == actor).with_for_update()).mappings().first()
            if not row or not self.eligible(connection, actor, row["requester_id"], org):
                fail("reuse_not_found", "Permission request unavailable.", 404)
            self._card(connection, actor, org, row["card_id"])
            status = "accepted" if action == "accept" else "declined"
            if row["status"] != "pending" and row["status"] != status:
                fail("permission_closed", "This permission request has already been answered.")
            connection.execute(update(reuse_requests).where(reuse_requests.c.id == identifier).values(status=status))
            self.notify(connection, row["requester_id"], actor, org, "reuse_" + status, identifier)
            # Acceptance never edits the recipient's drafts or completion ledger.
            return {"id": identifier, "status": status}

    def import_activity(self, connection, locked, mode, level, activity, expected_hash):
        if not isinstance(activity, str) or not normalize_activity(activity):
            fail("activity_empty", "An empty activity cannot be imported.", 422)
        slot = f"{mode}-{level}"
        drafts = deepcopy(mapping(locked.state.get("activityDrafts")))
        current = drafts.get(slot, "")
        if not isinstance(current, str) or activity_hash(current) != expected_hash:
            fail("destination_changed", "Your destination activity changed. Review it before explicitly replacing it.")
        drafts[slot] = normalize_activity(activity)
        proposed = {**deepcopy(locked.state), "activityDrafts": drafts}
        return self.states.write_locked(connection, locked, proposed).payload()

    def import_reuse(self, actor, org, identifier, expected_hash):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            locked = self.states.locked(connection, actor, org)
            row = connection.execute(select(reuse_requests).where(reuse_requests.c.id == identifier, reuse_requests.c.organization_id == org, reuse_requests.c.requester_id == actor, reuse_requests.c.status == "accepted")).mappings().first()
            if not row:
                fail("permission_required", "The author must grant permission before you import this activity.", 403)
            card = self._card(connection, actor, org, row["card_id"], network_only=True)
            return self.import_activity(connection, locked, card["mode"], card["source_level"], card["activity"], expected_hash)

    def eligible_idea(self, connection, responder, author, org, mode, level):
        if not self.eligible(connection, responder, author, org):
            return False
        state = connection.execute(select(user_states.c.state).where(user_states.c.user_id == responder, user_states.c.organization_id == org)).scalar_one_or_none()
        value = mapping(mapping(state).get("levels")).get(mode)
        return type(value) is int and value == level + 1

    def idea_dto(self, connection, row, actor, org):
        author = row["author_id"]
        result = {key: row[key] for key in ("id", "author_id", "mode", "source_level", "status")}
        profile = self.profile(connection, author, org)
        result["display_name"] = profile["display_name"] if profile else ""
        result["can_offer"] = row["status"] == "pending" and self.eligible_idea(connection, actor, author, org, row["mode"], row["source_level"])
        if author == actor:
            result["eligible_count"] = sum(self.eligible_idea(connection, member, author, org, row["mode"], row["source_level"]) for member in self.members(connection, author, org))
            offers = connection.execute(select(idea_offers).where(idea_offers.c.request_id == row["id"], idea_offers.c.organization_id == org)).mappings().all()
            result["offers"] = [{**{key: offer[key] for key in ("id", "responder_id", "activity", "activity_hash")}, "display_name": self.profile(connection, offer["responder_id"], org)["display_name"]} for offer in offers if self.eligible(connection, actor, offer["responder_id"], org)]
        else:
            result["offers"] = []
        return result

    def create_idea(self, actor, org, payload):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.profile(connection, actor, org, require_visible=True)
            self.states.locked(connection, actor, org)
            row = connection.execute(select(idea_requests).where(idea_requests.c.author_id == actor, idea_requests.c.organization_id == org, idea_requests.c.mode == payload.mode, idea_requests.c.source_level == payload.level, idea_requests.c.status == "pending")).mappings().first()
            if not row:
                identifier = str(uuid4())
                connection.execute(insert(idea_requests).values(id=identifier, organization_id=org, author_id=actor, mode=payload.mode, source_level=payload.level, status="pending"))
                row = connection.execute(select(idea_requests).where(idea_requests.c.id == identifier)).mappings().one()
            for member in self.members(connection, actor, org):
                if self.eligible_idea(connection, member, actor, org, payload.mode, payload.level):
                    self.notify(connection, member, actor, org, "local_idea_requested", row["id"])
            return self.idea_dto(connection, row, actor, org)

    def list_ideas(self, actor, org):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            authors = [actor, *self.members(connection, actor, org)]
            rows = connection.execute(select(idea_requests).where(idea_requests.c.organization_id == org, idea_requests.c.author_id.in_(authors), idea_requests.c.status == "pending").order_by(idea_requests.c.created_at.desc()).limit(100)).mappings().all()
            return {"requests": [self.idea_dto(connection, row, actor, org) for row in rows if row["author_id"] == actor or self.eligible_idea(connection, actor, row["author_id"], org, row["mode"], row["source_level"])]}

    def cancel_idea(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            self.states.locked(connection, actor, org)
            row = connection.execute(select(idea_requests).where(idea_requests.c.id == identifier, idea_requests.c.organization_id == org, idea_requests.c.author_id == actor).with_for_update()).mappings().first()
            if not row:
                fail("idea_not_found", "Local idea request unavailable.", 404)
            connection.execute(update(idea_requests).where(idea_requests.c.id == identifier).values(status="cancelled"))
            return {"id": identifier, "status": "cancelled"}

    def offer_idea(self, actor, org, identifier):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            locked = self.states.locked(connection, actor, org)
            row = connection.execute(select(idea_requests).where(idea_requests.c.id == identifier, idea_requests.c.organization_id == org, idea_requests.c.status == "pending").with_for_update()).mappings().first()
            if not row or not self.eligible_idea(connection, actor, row["author_id"], org, row["mode"], row["source_level"]):
                fail("idea_not_eligible", "Only a connected member currently at the next level can offer their saved practice.", 403)
            activity = mapping(locked.state.get("activityDrafts")).get(f"{row['mode']}-{row['source_level']}")
            if not isinstance(activity, str) or not normalize_activity(activity) or len(activity) > 12_000:
                fail("idea_no_activity", "Save a real activity for this source level before offering it.")
            old = connection.execute(select(idea_offers.c.id).where(idea_offers.c.request_id == identifier, idea_offers.c.responder_id == actor)).scalar_one_or_none()
            if old:
                return {"id": old}
            offer_id = str(uuid4())
            connection.execute(insert(idea_offers).values(id=offer_id, request_id=identifier, organization_id=org, requester_id=row["author_id"], responder_id=actor, activity=normalize_activity(activity), activity_hash=activity_hash(activity)))
            self.notify(connection, row["author_id"], actor, org, "local_idea_offered", identifier)
            return {"id": offer_id}

    def import_idea(self, actor, org, identifier, expected_hash):
        with self.engine.begin() as connection:
            self.active(connection, actor, org)
            locked = self.states.locked(connection, actor, org)
            offer = connection.execute(select(idea_offers).where(idea_offers.c.id == identifier, idea_offers.c.organization_id == org, idea_offers.c.requester_id == actor)).mappings().first()
            if not offer or not self.eligible(connection, actor, offer["responder_id"], org):
                fail("offer_not_found", "Local idea offer unavailable.", 404)
            request = connection.execute(select(idea_requests).where(idea_requests.c.id == offer["request_id"], idea_requests.c.status == "pending")).mappings().first()
            if not request:
                fail("idea_not_found", "This local idea request is no longer active.", 404)
            return self.import_activity(connection, locked, request["mode"], request["source_level"], offer["activity"], expected_hash)
