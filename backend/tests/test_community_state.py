from copy import deepcopy
from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, event, insert, select

from app.community_rules import activity_hash, completion_token
from app.community_schema import advance_claims, metadata, progress_controls, receipts, reviews, submissions, user_states
from app.community_state import CommunityStateStore, StateConflict, merge_device_document

MODES = ["fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"]
AUTHOR, ORG = "synthetic-author", "synthetic-org"


def existing_state():
    levels = {mode: index % 10 for index, mode in enumerate(MODES)}
    levels["fisico"] = 3
    return {"profileName": "Synthetic existing account", "levels": levels,
            "presets": {"Existing complete map": deepcopy(levels)}, "selectedPreset": "Existing complete map",
            "activityDrafts": {"fisico-3": "Cultivar 🌱 中文", "social-1": "Existing social practice", "visionario-9": "Legacy level9 definition"},
            "activityCompletions": {"social-1": completion_token("Existing social practice"), "visionario-9": completion_token("Legacy level9 definition")},
            "visionImages": {"visionario": "data:image/png;base64,synthetic-existing-image"},
            "activityReactions": {"fisico-3-c815d042b3d1b43c": "leaf"}, "featuredBadges": ["first-step"],
            "language": "es", "skin": "holista", "futureField": {"keep": "unknown to older client"}}


@pytest.fixture
def database():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    with engine.begin() as connection:
        for org in (ORG, "synthetic-other-org"):
            connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=org, slug=org, name=org, created_at=now))
        for user in (AUTHOR, "synthetic-reviewer-1", "synthetic-reviewer-2", "synthetic-reviewer-3"):
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=user, email=f"{user}@example.test", name=user, password_hash="not-a-real-password-hash", is_active=True, created_at=now))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=user, organization_id=ORG, roles=[], permissions=[], created_at=now))
        connection.execute(insert(user_states).values(user_id=AUTHOR, organization_id=ORG, state=existing_state(), updated_at=now))
    try:
        yield engine
    finally:
        engine.dispose()


def raw_state(database, user=AUTHOR, org=ORG):
    with database.begin() as connection:
        row = connection.execute(select(user_states.c.state, user_states.c.updated_at).where(user_states.c.user_id == user, user_states.c.organization_id == org)).mappings().one()
        return deepcopy(dict(row))


def seed_submission(connection, *, identifier="synthetic-submission", status="pending", actual_votes=0, receipt_voters=None, advance=False):
    activity = existing_state()["activityDrafts"]["fisico-3"]
    connection.execute(insert(submissions).values(id=identifier, organization_id=ORG, author_id=AUTHOR, mode="fisico", source_level=3, target_level=4, revision_number=1, activity=activity, activity_hash=activity_hash(activity), draft_token=completion_token(activity), rubric_version="synthetic-rubric", rubric_snapshot={}, evidence={"image": "synthetic stored proof fixture"}, target_alignment="Synthetic next clarity alignment", status=status, updated_at=datetime.now(timezone.utc)))
    for index in range(actual_votes):
        connection.execute(insert(reviews).values(submission_id=identifier, reviewer_id=f"synthetic-reviewer-{index + 1}", organization_id=ORG, author_id=AUTHOR, decision="approve", activity_match=True, effort_match=True, clarity_match=True, feedback=""))
    if receipt_voters is not None:
        connection.execute(insert(receipts).values(submission_id=identifier, organization_id=ORG, author_id=AUTHOR, reviewer_ids=receipt_voters, advanced=advance))
    if advance:
        connection.execute(insert(advance_claims).values(submission_id=identifier, organization_id=ORG, author_id=AUTHOR, mode="fisico", source_level=3))


def test_loading_and_repeated_loading_preserve_all_original_data_and_timestamp(database):
    original = raw_state(database)
    store = CommunityStateStore(database)
    loaded = store.load(AUTHOR, ORG)
    assert loaded.state == original["state"]
    assert loaded.validation_receipts == {}
    assert loaded.legacy_completion_slots == ["social-1"]
    assert store.load(AUTHOR, ORG).revision == loaded.revision
    assert raw_state(database) == original
    # A returned object is not a mutable alias into the stored state.
    loaded.state["levels"]["fisico"] = 0
    assert store.load(AUTHOR, ORG).state == original["state"]


def test_partial_save_keeps_all_twelve_levels_presets_and_unknown_fields(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    after = store.save(AUTHOR, ORG, {"profileName": "Synthetic renamed profile", "levels": {"fisico": 4}}, before.revision)
    expected = existing_state()
    expected["profileName"] = "Synthetic renamed profile"
    expected["levels"]["fisico"] = 4
    assert after.state == expected
    assert after.revision != before.revision
    assert store.load(AUTHOR, ORG).state == expected


def test_stale_write_is_rejected_without_overwriting_the_new_revision(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    new = store.save(AUTHOR, ORG, {"profileName": "Changed by another tab"}, before.revision)
    raw = raw_state(database)
    with pytest.raises(StateConflict) as error:
        store.save(AUTHOR, ORG, before.state, before.revision)
    assert error.value.snapshot.revision == new.revision
    assert error.value.snapshot.state["profileName"] == "Changed by another tab"
    assert raw_state(database) == raw


def test_old_client_without_initial_load_gets_a_stable_retryable_revision(database):
    store = CommunityStateStore(database)
    with pytest.raises(StateConflict) as error:
        store.save("synthetic-new-user", ORG, {"levels": {"fisico": 2}}, None)
    revision = error.value.snapshot.revision
    assert store.load("synthetic-new-user", ORG).revision == revision
    result = store.save("synthetic-new-user", ORG, {"levels": {"fisico": 2}}, revision)
    assert result.state["levels"] == {"fisico": 2}


def test_client_json_cannot_forge_a_receipt_or_new_completion(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    result = store.save(AUTHOR, ORG, {"activityCompletions": {"fisico-3": completion_token(before.state["activityDrafts"]["fisico-3"])}, "validationReceipts": {"fisico-3": {"reviewerCount": 3}}, "communityApprovals": ["one", "two", "three"]}, before.revision)
    assert "fisico-3" not in result.state["activityCompletions"]
    assert result.state["activityCompletions"] == existing_state()["activityCompletions"]
    assert result.validation_receipts == {}
    assert "validationReceipts" not in result.state
    assert "communityApprovals" not in result.state


def test_device_merge_keeps_cloud_conflicts_and_all_existing_data(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    local_levels = {mode: 8 for mode in MODES}
    device = {"levels": local_levels, "presets": {"Existing complete map": local_levels, "Device map": local_levels}, "profileName": "Do not overwrite cloud profile", "activityDrafts": {"fisico-3": "Conflicting device practice", "ludico-2": "A historical local practice"}, "activityCompletions": {"ludico-2": completion_token("A historical local practice")}}
    result = store.merge_device(AUTHOR, ORG, device)
    assert result.state["levels"] == before.state["levels"]
    assert result.state["presets"]["Existing complete map"] == before.state["presets"]["Existing complete map"]
    assert result.state["presets"]["Device map"] == local_levels
    for field in ("profileName", "selectedPreset", "visionImages", "activityReactions", "featuredBadges", "language", "skin", "futureField"):
        assert result.state[field] == before.state[field]
    assert result.state["activityDrafts"]["fisico-3"] == before.state["activityDrafts"]["fisico-3"]
    assert "ludico-2" not in result.state["activityCompletions"]
    assert "ludico-2" not in result.legacy_completion_slots
    assert result.validation_receipts == {}
    with database.begin() as connection:
        history = connection.execute(select(progress_controls.c.legacy_snapshot).where(progress_controls.c.user_id == AUTHOR)).scalar_one()
    assert history["activityDrafts"] == before.state["activityDrafts"]
    assert history["activityCompletions"] == before.state["activityCompletions"]
    assert history["unverifiedDeviceHistory"]["activityCompletions"] == device["activityCompletions"]
    again = store.merge_device(AUTHOR, ORG, {"activityDrafts": {"emocional-1": "New forged completion"}, "activityCompletions": {"emocional-1": completion_token("New forged completion")}})
    assert "emocional-1" not in again.state["activityCompletions"]
    assert again.state["levels"] == before.state["levels"]


def test_first_merge_cannot_credit_existing_or_new_post_cutover_drafts(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    claims = {"fisico-3": completion_token(before.state["activityDrafts"]["fisico-3"]), "ludico-2": completion_token("New unverified device practice")}
    result = store.merge_device(AUTHOR, ORG, {"activityDrafts": {"ludico-2": "New unverified device practice"}, "activityCompletions": claims})
    assert result.state["activityCompletions"] == before.state["activityCompletions"]
    assert result.legacy_completion_slots == before.legacy_completion_slots
    assert result.validation_receipts == {}
    # A brand-new account has no server-captured historical credit either.
    fresh = store.merge_device("synthetic-new-user", ORG, {"activityDrafts": {"ludico-2": "New unverified device practice"}, "activityCompletions": claims})
    assert fresh.state["activityCompletions"] == {} and fresh.legacy_completion_slots == []
    with database.begin() as connection:
        history = connection.execute(select(progress_controls.c.legacy_snapshot).where(progress_controls.c.user_id == "synthetic-new-user")).scalar_one()
    assert history["activityCompletions"] == {}
    assert history["unverifiedDeviceHistory"]["activityCompletions"] == claims


def test_device_alignment_merge_keeps_cloud_slots_imports_new_slots_and_archives_originals(database):
    store = CommunityStateStore(database)
    baseline = store.load(AUTHOR, ORG)
    cloud_alignments = {"fisico-3": "Cloud next-clarity explanation", "social-1": "Cloud-only explanation"}
    cloud = store.save(AUTHOR, ORG, {"activityAlignments": cloud_alignments}, baseline.revision)
    device = {"activityDrafts": {"fisico-3": "Conflicting device definition", "ludico-2": "Device-only practice"},
              "activityAlignments": {"fisico-3": "Conflicting device explanation", "ludico-2": "Device-only next clarity explanation"},
              "activityCompletions": {"ludico-2": completion_token("Device-only practice")}}
    original = deepcopy(device)
    merged = store.merge_device(AUTHOR, ORG, device)
    assert device == original
    assert merged.state["activityAlignments"] == {**device["activityAlignments"], **cloud_alignments}
    assert merged.state["activityDrafts"] == {**device["activityDrafts"], **cloud.state["activityDrafts"]}
    assert merged.state["activityCompletions"] == baseline.state["activityCompletions"]
    assert merged.validation_receipts == {} and merged.legacy_completion_slots == baseline.legacy_completion_slots
    assert merged.state["levels"] == baseline.state["levels"] and merged.state["presets"] == baseline.state["presets"]
    with database.begin() as connection:
        history = deepcopy(connection.execute(select(progress_controls.c.legacy_snapshot).where(progress_controls.c.user_id == AUTHOR)).scalar_one())
    assert history["activityDrafts"] == baseline.state["activityDrafts"]
    assert history["activityCompletions"] == baseline.state["activityCompletions"]
    assert history["unverifiedDeviceHistory"] == original
    retry = store.merge_device(AUTHOR, ORG, {"activityAlignments": {"fisico-3": "Later conflicting device explanation", "emocional-1": "New imported explanation"}})
    assert retry.state["activityAlignments"] == {**merged.state["activityAlignments"], "emocional-1": "New imported explanation"}
    with database.begin() as connection:
        retained = connection.execute(select(progress_controls.c.legacy_snapshot).where(progress_controls.c.user_id == AUTHOR)).scalar_one()
    assert retained["unverifiedDeviceHistory"]["activityDrafts"] == original["activityDrafts"]
    assert retained["unverifiedDeviceHistory"]["activityCompletions"] == original["activityCompletions"]
    assert retained["unverifiedDeviceHistory"]["activityAlignments"] == {**original["activityAlignments"], "emocional-1": "New imported explanation"}


def test_history_comparison_uses_ecmascript_trim_without_rewriting_saved_text(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    drafts = {**before.state["activityDrafts"], "social-1": "\ufeffExisting social practice\ufeff"}
    result = store.save(AUTHOR, ORG, {"activityDrafts": drafts}, before.revision)
    assert result.state["activityDrafts"] == drafts
    assert result.state["activityCompletions"] == before.state["activityCompletions"]
    assert result.legacy_completion_slots == ["social-1"]


def test_true_quorum_receipt_survives_stale_save_but_edit_invalidates_its_match(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    voters = [f"synthetic-reviewer-{index}" for index in (1, 2, 3)]
    with database.begin() as connection:
        locked = store.locked(connection, AUTHOR, ORG)
        seed_submission(connection, status="approved", actual_votes=3, receipt_voters=voters, advance=True)
        proposed = deepcopy(locked.state)
        proposed["levels"]["fisico"] = 4
        approved = store.write_locked(connection, locked, proposed)
    assert approved.state["activityCompletions"]["fisico-3"] == completion_token("Cultivar 🌱 中文")
    assert approved.validation_receipts["fisico-3"]["reviewerCount"] == 3
    assert approved.validation_receipts["fisico-3"]["advanced"] is True
    with pytest.raises(StateConflict):
        store.save(AUTHOR, ORG, before.state, before.revision)
    assert store.load(AUTHOR, ORG).state["levels"]["fisico"] == 4
    edited = deepcopy(approved.state)
    edited["activityDrafts"]["fisico-3"] = "A different activity needs fresh evidence and review"
    result = store.save(AUTHOR, ORG, edited, approved.revision)
    assert "fisico-3" not in result.state["activityCompletions"]
    assert "fisico-3" not in result.validation_receipts
    assert result.state["levels"]["fisico"] == 4
    with database.begin() as connection:
        assert connection.execute(select(receipts)).mappings().one()["advanced"] is True
        assert connection.execute(select(advance_claims)).mappings().one()["source_level"] == 3


@pytest.mark.parametrize("voters,actual_votes", [
    (["synthetic-reviewer-1", "synthetic-reviewer-1", "synthetic-reviewer-2"], 2),
    ([AUTHOR, "synthetic-reviewer-1", "synthetic-reviewer-2"], 2),
    (["synthetic-reviewer-1", "synthetic-reviewer-2", "synthetic-reviewer-3"], 2),
    (["synthetic-reviewer-1", "synthetic-reviewer-2", {"fake": True}], 0),
])
def test_invalid_or_unbacked_receipts_do_not_count(database, voters, actual_votes):
    store = CommunityStateStore(database)
    store.load(AUTHOR, ORG)
    with database.begin() as connection:
        seed_submission(connection, status="approved", actual_votes=actual_votes, receipt_voters=voters)
    result = store.load(AUTHOR, ORG)
    assert "fisico-3" not in result.state["activityCompletions"]
    assert result.validation_receipts == {}


def test_changed_draft_marks_pending_evidence_stale_without_erasing_it(database):
    store = CommunityStateStore(database)
    before = store.load(AUTHOR, ORG)
    with database.begin() as connection:
        seed_submission(connection)
    drafts = {**before.state["activityDrafts"], "fisico-3": "Changed definition"}
    result = store.save(AUTHOR, ORG, {"activityDrafts": drafts}, before.revision)
    assert result.state["presets"] == before.state["presets"]
    with database.begin() as connection:
        row = connection.execute(select(submissions)).mappings().one()
        assert row["status"] == "stale"
        assert row["activity"] == "Cultivar 🌱 中文"


def test_state_and_revision_are_scoped_to_user_and_organization(database):
    store = CommunityStateStore(database)
    first = store.load(AUTHOR, ORG)
    other = store.load(AUTHOR, "synthetic-other-org")
    assert other.state == {"activityCompletions": {}}
    assert other.validation_receipts == {}
    assert other.revision != first.revision
    with pytest.raises(StateConflict):
        store.save(AUTHOR, "synthetic-other-org", {"profileName": "No cross-org revision"}, first.revision)
    assert store.load(AUTHOR, ORG).state == first.state


def test_pure_device_merge_does_not_mutate_either_snapshot():
    local, cloud = {"presets": {"Local": {"fisico": 1}}}, {"presets": {"Cloud": {"fisico": 2}}, "featuredBadges": ["first-step"]}
    expected_local, expected_cloud = deepcopy(local), deepcopy(cloud)
    result = merge_device_document(local, cloud)
    result["presets"]["Cloud"]["fisico"] = 9
    assert local == expected_local
    assert cloud == expected_cloud
