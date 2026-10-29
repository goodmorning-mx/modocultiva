from copy import deepcopy
from datetime import datetime, timedelta, timezone
from uuid import UUID

import pytest
from sqlalchemy import func, insert, select, update

from app.community_errors import CommunityError
from app.community_media import CommunityMediaStore
from app.community_rules import ReviewInput, SubmissionInput, activity_hash, completion_token
from app.community_schema import advance_claims, connections, media_assets, metadata, notifications, receipts, reviews, submissions, user_states
from app.community_service import CommunityService
from app.community_state import CommunityStateStore, StateConflict
from test_community_foundation import png
from test_community_media import mp4
from test_community_state import AUTHOR, ORG, database, existing_state

VOTERS = [f"synthetic-reviewer-{index}" for index in (1, 2, 3)]
ACTIVITY = existing_state()["activityDrafts"]["fisico-3"]


@pytest.fixture
def service(database):
    store = CommunityService(database)
    for actor in [AUTHOR, *VOTERS]:
        store.set_profile(actor, ORG, "Synthetic " + actor, "A synthetic member bio", True)
    for actor in VOTERS:
        invitation = store.request_connection(AUTHOR, ORG, actor)
        store.change_connection(actor, ORG, invitation["id"], "accept")
    return store


def payload(**changes):
    return SubmissionInput(mode="fisico", level=3, expected_activity_hash=activity_hash(ACTIVITY), evidence={"reflection": "I performed this actual routine and can now sustain its minimum structure.", "image": png()}, target_alignment="This routine helps me recognize the minimum structure in the next clarity description.", **changes)


def vote(**changes):
    return ReviewInput(**{"expected_activity_hash": activity_hash(ACTIVITY), "decision": "approve", "activity_match": True, "effort_match": True, "clarity_match": True, **changes})


def approve_three(service, identifier):
    return [service.review(actor, ORG, identifier, vote()) for actor in VOTERS][-1]


def test_real_three_member_quorum_completes_and_advances_atomically_once(service, database):
    before = service.states.load(AUTHOR, ORG)
    submitted = service.submit(AUTHOR, ORG, payload())
    assert submitted["review_count"] == 0 and submitted["status"] == "pending"
    assert submitted["rubric_snapshot"]["target"]["level"] == 4
    assert service.submit(AUTHOR, ORG, payload())["id"] == submitted["id"]
    for count, reviewer in enumerate(VOTERS, 1):
        result = service.review(reviewer, ORG, submitted["id"], vote())
        state = service.states.load(AUTHOR, ORG)
        assert result["review_count"] == count
        assert result["status"] == ("approved" if count == 3 else "pending")
        assert state.state["levels"]["fisico"] == (4 if count == 3 else 3)
        assert ("fisico-3" in state.validation_receipts) == (count == 3)
    assert result["advanced"] is True
    assert state.state["activityCompletions"]["fisico-3"] == completion_token(ACTIVITY)
    assert state.state["presets"] == before.state["presets"]
    assert len(state.state["levels"]) == 12
    assert state.state["visionImages"] == before.state["visionImages"]
    assert service.review(VOTERS[-1], ORG, submitted["id"], vote())["status"] == "approved"
    with database.begin() as connection:
        assert connection.execute(select(func.count()).select_from(receipts)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(advance_claims)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(reviews)).scalar_one() == 3
    with pytest.raises(StateConflict):
        service.states.save(AUTHOR, ORG, before.state, before.revision)
    assert service.states.load(AUTHOR, ORG).state["levels"]["fisico"] == 4


@pytest.mark.parametrize("new_level", [0, 5, 9])
def test_old_or_future_source_completes_without_jumping_or_regressing(service, new_level):
    submitted = service.submit(AUTHOR, ORG, payload())
    current = service.states.load(AUTHOR, ORG)
    service.states.save(AUTHOR, ORG, {"levels": {"fisico": new_level}}, current.revision)
    assert approve_three(service, submitted["id"])["advanced"] is False
    after = service.states.load(AUTHOR, ORG)
    assert after.state["levels"]["fisico"] == new_level
    assert "fisico-3" in after.state["activityCompletions"]


def test_reassessment_cannot_replay_a_prior_source_advancement(service):
    submitted = service.submit(AUTHOR, ORG, payload())
    approve_three(service, submitted["id"])
    current = service.states.load(AUTHOR, ORG)
    changed_activity = ACTIVITY + " A newly revised practice."
    changed = service.states.save(AUTHOR, ORG, {"levels": {"fisico": 3}, "activityDrafts": {**current.state["activityDrafts"], "fisico-3": changed_activity}}, current.revision)
    new_payload = payload().model_copy(update={"expected_activity_hash": activity_hash(changed_activity)})
    revised = service.submit(AUTHOR, ORG, new_payload)
    for actor in VOTERS:
        result = service.review(actor, ORG, revised["id"], vote(expected_activity_hash=activity_hash(changed_activity)))
    assert result["status"] == "approved" and result["advanced"] is False
    assert service.states.load(AUTHOR, ORG).state["levels"]["fisico"] == 3


def test_changes_requested_returns_evidence_stage_and_replacement_starts_at_zero(service):
    first = service.submit(AUTHOR, ORG, payload())
    service.review(VOTERS[0], ORG, first["id"], vote())
    result = service.review(VOTERS[1], ORG, first["id"], vote(decision="changes_requested", clarity_match=False, feedback="Please show how this practice establishes the next level's minimum routine."))
    assert result["status"] == "changes_requested" and result["review_count"] == 1
    with pytest.raises(CommunityError, match="no longer awaiting"):
        service.review(VOTERS[2], ORG, first["id"], vote())
    second = service.submit(AUTHOR, ORG, payload())
    assert second["id"] != first["id"] and second["revision_number"] == 2
    assert second["review_count"] == 0 and second["status"] == "pending"
    assert service.read_submission(AUTHOR, ORG, first["id"])["status"] == "superseded"
    with pytest.raises(CommunityError):
        service.read_submission(VOTERS[0], ORG, first["id"])
    assert approve_three(service, second["id"])["status"] == "approved"


def test_changed_activity_invalidates_pending_evidence_and_old_votes(service):
    first = service.submit(AUTHOR, ORG, payload())
    service.review(VOTERS[0], ORG, first["id"], vote())
    current = service.states.load(AUTHOR, ORG)
    service.states.save(AUTHOR, ORG, {"activityDrafts": {**current.state["activityDrafts"], "fisico-3": "A changed activity with a different evidence requirement"}}, current.revision)
    assert service.read_submission(AUTHOR, ORG, first["id"])["status"] == "stale"
    with pytest.raises(CommunityError):
        service.review(VOTERS[1], ORG, first["id"], vote())
    with pytest.raises(CommunityError, match="Save the exact"):
        service.submit(AUTHOR, ORG, payload())
    assert "fisico-3" not in service.states.load(AUTHOR, ORG).validation_receipts


def test_self_duplicate_changed_vote_hash_cross_org_and_nonconnection_are_rejected(service):
    submitted = service.submit(AUTHOR, ORG, payload())
    with pytest.raises(CommunityError) as error:
        service.review(AUTHOR, ORG, submitted["id"], vote())
    assert error.value.status_code == 403
    with pytest.raises(CommunityError):
        service.review(VOTERS[0], "synthetic-other-org", submitted["id"], vote())
    with pytest.raises(CommunityError, match="exact activity revision"):
        service.review(VOTERS[0], ORG, submitted["id"], vote(expected_activity_hash="0" * 64))
    service.review(VOTERS[0], ORG, submitted["id"], vote())
    assert service.review(VOTERS[0], ORG, submitted["id"], vote())["review_count"] == 1
    with pytest.raises(CommunityError, match="only once"):
        service.review(VOTERS[0], ORG, submitted["id"], vote(decision="changes_requested", feedback="This is a different vote that must not replace the original."))
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == VOTERS[1])["connection"]
    service.change_connection(AUTHOR, ORG, relation["id"], "disconnect")
    with pytest.raises(CommunityError):
        service.review(VOTERS[1], ORG, submitted["id"], vote())


def test_voter_who_disconnected_before_quorum_does_not_count_but_past_receipt_survives(service, database):
    submitted = service.submit(AUTHOR, ORG, payload())
    service.review(VOTERS[0], ORG, submitted["id"], vote())
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == VOTERS[0])["connection"]
    service.change_connection(AUTHOR, ORG, relation["id"], "disconnect")
    service.review(VOTERS[1], ORG, submitted["id"], vote())
    result = service.review(VOTERS[2], ORG, submitted["id"], vote())
    assert result["review_count"] == 2 and result["status"] == "pending"
    # A fresh connected fourth person may finish the quorum; no invented vote.
    with database.begin() as connection:
        connection.execute(insert(metadata.tables["gm_auth_users"]).values(id="synthetic-fourth", email="fourth@example.test", name="Fourth", password_hash="synthetic", is_active=True, created_at=datetime.now(timezone.utc)))
        connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id="synthetic-fourth", organization_id=ORG, roles=[], permissions=[], created_at=datetime.now(timezone.utc)))
    service.set_profile("synthetic-fourth", ORG, "Fourth", "", True)
    invited = service.request_connection(AUTHOR, ORG, "synthetic-fourth")
    service.change_connection("synthetic-fourth", ORG, invited["id"], "accept")
    result = service.review("synthetic-fourth", ORG, submitted["id"], vote())
    assert result["status"] == "approved"
    service.change_connection(AUTHOR, ORG, invited["id"], "disconnect")
    current = service.states.load(AUTHOR, ORG)
    assert current.validation_receipts["fisico-3"]["reviewerCount"] == 3
    assert current.state["levels"]["fisico"] == 4
    with pytest.raises(CommunityError):
        service.read_submission("synthetic-fourth", ORG, submitted["id"])


def test_video_submission_must_reference_actual_immutable_upload_owned_by_author(service, database):
    invalid = payload().model_copy(update={"evidence": payload().evidence.model_copy(update={"image": None, "video_asset_id": UUID("00000000-0000-4000-8000-000000000001")})})
    with pytest.raises(CommunityError, match="actual private video"):
        service.submit(AUTHOR, ORG, invalid)
    media = CommunityMediaStore(database)
    other_asset = media.upload(VOTERS[0], ORG, mp4(), "video/mp4")
    with pytest.raises(CommunityError):
        service.submit(AUTHOR, ORG, invalid.model_copy(update={"evidence": invalid.evidence.model_copy(update={"video_asset_id": UUID(other_asset["id"])})}))
    own = media.upload(AUTHOR, ORG, mp4(), "video/mp4")
    submitted = service.submit(AUTHOR, ORG, invalid.model_copy(update={"evidence": invalid.evidence.model_copy(update={"video_asset_id": UUID(own["id"])})}))
    assert submitted["evidence"]["video"]["sha256"] == own["sha256"]
    assert media.read(VOTERS[0], ORG, own["id"])["content"] == mp4()
    service.withdraw(AUTHOR, ORG, submitted["id"])
    with pytest.raises(CommunityError):
        media.read(VOTERS[0], ORG, own["id"])


def test_directory_is_opt_in_allowlisted_without_private_data_or_email(service):
    result = service.directory(AUTHOR, ORG)
    assert len(result["members"]) == 3
    assert set(result["members"][0]) == {"user_id", "display_name", "bio", "levels", "connection"}
    assert all(member["connection"]["status"] == "accepted" for member in result["members"])
    service.set_profile(VOTERS[0], ORG, "Private", "", False)
    assert len(service.directory(AUTHOR, ORG)["members"]) == 2
    with pytest.raises(CommunityError):
        service.directory(VOTERS[0], ORG)
    assert service.inbox(VOTERS[0], ORG) == {"submissions": []}


def test_invitation_requires_recipient_response_and_never_self_accepts(service):
    with pytest.raises(CommunityError):
        service.request_connection(AUTHOR, ORG, AUTHOR)
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == VOTERS[0])["connection"]
    service.change_connection(AUTHOR, ORG, relation["id"], "disconnect")
    invited = service.request_connection(AUTHOR, ORG, VOTERS[0])
    assert invited["status"] == "pending"
    assert service.request_connection(AUTHOR, ORG, VOTERS[0])["id"] == invited["id"]
    with pytest.raises(CommunityError):
        service.change_connection(AUTHOR, ORG, invited["id"], "accept")
    assert service.change_connection(VOTERS[0], ORG, invited["id"], "decline")["status"] == "declined"


def test_notifications_are_recipient_scoped_and_contain_no_private_proof(service):
    submitted = service.submit(AUTHOR, ORG, payload())
    notices = service.notices(VOTERS[0], ORG)["notifications"]
    evidence_notice = next(row for row in notices if row["kind"] == "evidence_ready")
    assert evidence_notice["resource_id"] == submitted["id"]
    assert set(evidence_notice) == {"id", "kind", "resource_id", "read", "created_at"}
    with pytest.raises(CommunityError):
        service.mark_notice(VOTERS[1], ORG, evidence_notice["id"])
    assert service.mark_notice(VOTERS[0], ORG, evidence_notice["id"])["read"] is True


def test_review_inbox_and_private_photo_visibility_require_actual_accepted_connection(service):
    submitted = service.submit(AUTHOR, ORG, payload())
    assert service.inbox(VOTERS[0], ORG)["submissions"][0]["evidence"]["image"] == png()
    assert service.read_submission(VOTERS[0], ORG, submitted["id"])["can_review"] is True
    service.review(VOTERS[0], ORG, submitted["id"], vote())
    assert service.read_submission(VOTERS[0], ORG, submitted["id"])["can_review"] is False
    service.withdraw(AUTHOR, ORG, submitted["id"])
    assert service.inbox(VOTERS[1], ORG)["submissions"] == []
    with pytest.raises(CommunityError):
        service.read_submission(VOTERS[1], ORG, submitted["id"])
    assert service.read_submission(AUTHOR, ORG, submitted["id"])["status"] == "withdrawn"


def test_bom_wrapped_activity_validates_and_exports_receipt_without_resetting_state(service):
    before = service.states.load(AUTHOR, ORG)
    wrapped = "\ufeff" + ACTIVITY + "\ufeff"
    service.states.save(AUTHOR, ORG, {"activityDrafts": {**before.state["activityDrafts"], "fisico-3": wrapped}}, before.revision)
    submitted = service.submit(AUTHOR, ORG, payload())
    assert submitted["activity"] == ACTIVITY
    assert approve_three(service, submitted["id"])["advanced"] is True
    result = service.states.load(AUTHOR, ORG)
    assert result.validation_receipts["fisico-3"]["reviewerCount"] == 3
    assert result.state["activityCompletions"]["fisico-3"] == completion_token(ACTIVITY)
    assert result.state["activityDrafts"]["fisico-3"] == wrapped
    assert result.state["levels"] == {**before.state["levels"], "fisico": 4}
    assert result.state["presets"] == before.state["presets"]
    assert result.state["visionImages"] == before.state["visionImages"]


@pytest.mark.parametrize("empty", ["", "\ufeff", " \ufeff\u3000\t"])
def test_normalization_empty_activities_cannot_be_submitted(service, empty):
    before = service.states.load(AUTHOR, ORG)
    service.states.save(AUTHOR, ORG, {"activityDrafts": {**before.state["activityDrafts"], "fisico-3": empty}}, before.revision)
    with pytest.raises(CommunityError, match="Save the exact"):
        service.submit(AUTHOR, ORG, payload().model_copy(update={"expected_activity_hash": activity_hash(empty)}))


def test_identical_pending_retry_after_reconnect_reconciles_quorum_without_new_vote(service, database):
    submitted = service.submit(AUTHOR, ORG, payload())
    service.review(VOTERS[0], ORG, submitted["id"], vote())
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == VOTERS[0])["connection"]["id"]
    service.change_connection(AUTHOR, ORG, relation, "disconnect")
    for actor in VOTERS[1:]:
        assert service.review(actor, ORG, submitted["id"], vote())["status"] == "pending"
    invited = service.request_connection(AUTHOR, ORG, VOTERS[0])
    accepted = service.change_connection(VOTERS[0], ORG, invited["id"], "accept")
    assert accepted["reconciled_submissions"] == 1
    assert service.read_submission(AUTHOR, ORG, submitted["id"])["status"] == "approved"
    before = service.states.load(AUTHOR, ORG)
    result = service.review(VOTERS[0], ORG, submitted["id"], vote())
    assert result["status"] == "approved" and result["review_count"] == 3 and result["advanced"] is True
    approved = service.states.load(AUTHOR, ORG)
    assert approved.state["levels"] == {**before.state["levels"], "fisico": 4}
    for actor in VOTERS:
        assert service.review(actor, ORG, submitted["id"], vote())["status"] == "approved"
    with database.begin() as connection:
        assert connection.execute(select(func.count()).select_from(reviews)).scalar_one() == 3
        assert connection.execute(select(func.count()).select_from(receipts)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(advance_claims)).scalar_one() == 1
    assert service.states.load(AUTHOR, ORG).revision == approved.revision


def test_identical_pending_retry_also_recovers_if_postcommit_reconcile_was_interrupted(service, monkeypatch):
    submitted = service.submit(AUTHOR, ORG, payload())
    service.review(VOTERS[0], ORG, submitted["id"], vote())
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == VOTERS[0])["connection"]["id"]
    service.change_connection(AUTHOR, ORG, relation, "disconnect")
    for actor in VOTERS[1:]:
        service.review(actor, ORG, submitted["id"], vote())
    invited = service.request_connection(AUTHOR, ORG, VOTERS[0])
    monkeypatch.setattr(service, "reconcile_connection", lambda *args: 0)
    service.change_connection(VOTERS[0], ORG, invited["id"], "accept")
    assert service.read_submission(AUTHOR, ORG, submitted["id"])["status"] == "pending"
    assert service.review(VOTERS[0], ORG, submitted["id"], vote())["status"] == "approved"


def test_accept_reconciles_both_members_without_extra_votes_and_repeated_accept_never_replays(service, database):
    peer = VOTERS[0]
    for voter in VOTERS[1:]:
        invite = service.request_connection(peer, ORG, voter)
        service.change_connection(voter, ORG, invite["id"], "accept")
    source = service.states.load(AUTHOR, ORG)
    current = service.states.load(peer, ORG)
    service.states.save(peer, ORG, {"levels": source.state["levels"], "presets": source.state["presets"], "activityDrafts": {"fisico-3": ACTIVITY}}, current.revision)
    first = service.submit(AUTHOR, ORG, payload())
    second = service.submit(peer, ORG, payload())
    service.review(peer, ORG, first["id"], vote())
    service.review(AUTHOR, ORG, second["id"], vote())
    relation = next(row for row in service.directory(AUTHOR, ORG)["members"] if row["user_id"] == peer)["connection"]["id"]
    service.change_connection(AUTHOR, ORG, relation, "disconnect")
    for voter in VOTERS[1:]:
        assert service.review(voter, ORG, first["id"], vote())["status"] == "pending"
        assert service.review(voter, ORG, second["id"], vote())["status"] == "pending"
    invite = service.request_connection(AUTHOR, ORG, peer)
    assert service.change_connection(peer, ORG, invite["id"], "accept")["reconciled_submissions"] == 2
    approved = {actor: service.states.load(actor, ORG) for actor in (AUTHOR, peer)}
    assert all(snapshot.state["levels"]["fisico"] == 4 for snapshot in approved.values())
    assert service.change_connection(peer, ORG, invite["id"], "accept")["reconciled_submissions"] == 0
    assert all(service.states.load(actor, ORG).revision == approved[actor].revision for actor in approved)
    with database.begin() as connection:
        assert connection.execute(select(func.count()).select_from(reviews)).scalar_one() == 6
        assert connection.execute(select(func.count()).select_from(receipts)).scalar_one() == 2
        assert connection.execute(select(func.count()).select_from(advance_claims)).scalar_one() == 2


def test_submission_hour_limit_counts_superseded_and_withdrawn_revisions_but_dedups_first(service, database, monkeypatch):
    import app.community_media as media
    monkeypatch.setattr(media, "MAX_SUBMISSIONS_PER_HOUR", 2)
    first = service.submit(AUTHOR, ORG, payload())
    second_payload = payload().model_copy(update={"target_alignment": "A second description of the same next clarity destination."})
    second = service.submit(AUTHOR, ORG, second_payload)
    before = service.states.load(AUTHOR, ORG)
    assert service.submit(AUTHOR, ORG, second_payload)["id"] == second["id"]
    with pytest.raises(CommunityError) as error:
        service.submit(AUTHOR, ORG, payload())
    assert error.value.code == "evidence_submission_rate" and error.value.status_code == 429
    assert service.read_submission(AUTHOR, ORG, second["id"])["status"] == "pending"
    service.withdraw(AUTHOR, ORG, second["id"])
    with pytest.raises(CommunityError) as error:
        service.submit(AUTHOR, ORG, payload())
    assert error.value.code == "evidence_submission_rate"
    assert service.states.load(AUTHOR, ORG).state == before.state
    with database.begin() as connection:
        connection.execute(update(submissions).where(submissions.c.id == first["id"]).values(created_at=datetime.now(timezone.utc) - timedelta(hours=2)))
    assert service.submit(AUTHOR, ORG, payload())["revision_number"] == 3


def test_retained_photo_budget_counts_all_revisions_and_preserves_pending_on_failure(service, database, monkeypatch):
    import app.community_media as media
    evidence = payload().evidence.model_dump(mode="json", exclude_none=True)
    charge = media.evidence_document_bytes(evidence)
    monkeypatch.setattr(media, "MAX_RETAINED_EVIDENCE_BYTES", 2 * charge)
    first = service.submit(AUTHOR, ORG, payload())
    second_payload = payload().model_copy(update={"target_alignment": "A second explicit next clarity explanation for the same photo."})
    second = service.submit(AUTHOR, ORG, second_payload)
    before = service.states.load(AUTHOR, ORG)
    with database.begin() as connection:
        timestamp = connection.execute(select(user_states.c.updated_at).where(user_states.c.user_id == AUTHOR)).scalar_one()
    assert service.submit(AUTHOR, ORG, second_payload)["id"] == second["id"]
    with pytest.raises(CommunityError) as error:
        service.submit(AUTHOR, ORG, payload())
    assert error.value.code == "evidence_storage_quota" and error.value.status_code == 413
    assert service.read_submission(AUTHOR, ORG, first["id"])["status"] == "superseded"
    assert service.read_submission(AUTHOR, ORG, second["id"])["status"] == "pending"
    with database.begin() as connection:
        assert connection.execute(select(user_states.c.updated_at).where(user_states.c.user_id == AUTHOR)).scalar_one() == timestamp
        assert connection.execute(select(func.count()).select_from(submissions)).scalar_one() == 2
    assert service.states.load(AUTHOR, ORG).state == before.state


def test_invitation_membership_serialization_compiles_to_no_key_update(service, database):
    from sqlalchemy import event
    from sqlalchemy.dialects import postgresql
    statements = []
    def capture(connection, clause, multiparams, params, execution_options):
        if getattr(clause, "_for_update_arg", None) is not None:
            statements.append(str(clause.compile(dialect=postgresql.dialect())))
    event.listen(database, "before_execute", capture)
    try:
        service.request_connection(AUTHOR, ORG, VOTERS[0])
    finally:
        event.remove(database, "before_execute", capture)
    assert any("gm_auth_memberships" in statement and "FOR NO KEY UPDATE" in statement for statement in statements)
