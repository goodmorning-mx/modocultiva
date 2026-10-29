import pytest

from app.community_errors import CommunityError
from app.community_rules import ActivityShareInput, IdeaRequestInput, activity_hash
from app.community_sharing import CommunitySharingService
from test_community_service import ACTIVITY, VOTERS, payload, service
from test_community_state import AUTHOR, ORG, database


@pytest.fixture
def sharing(service, database):
    return CommunitySharingService(database)


def card(sharing):
    return sharing.share(AUTHOR, ORG, ActivityShareInput(mode="fisico", level=3, expected_activity_hash=activity_hash(ACTIVITY)))


def test_feed_is_explicit_activity_only_never_private_evidence_or_a_review(sharing):
    original = sharing.states.load(AUTHOR, ORG)
    assert sharing.feed(VOTERS[0], ORG) == {"cards": []}
    sharing.submit(AUTHOR, ORG, payload())
    shared = card(sharing)
    assert card(sharing)["id"] == shared["id"]
    assert set(shared) == {"id", "author_id", "mode", "source_level", "activity", "activity_hash", "created_at", "display_name", "reactions", "my_reaction", "reuse", "audience", "has_evidence"}
    assert sharing.feed(VOTERS[0], ORG)["cards"][0]["activity"] == ACTIVITY
    result = sharing.react(VOTERS[0], ORG, shared["id"], "leaf")
    assert result["reactions"]["leaf"] == 1
    assert sharing.react(VOTERS[0], ORG, shared["id"], "water")["reactions"]["leaf"] == 0
    assert sharing.react(VOTERS[0], ORG, shared["id"], None)["my_reaction"] is None
    latest = sharing.states.load(AUTHOR, ORG)
    assert latest.state == original.state and latest.validation_receipts == {}
    assert sharing.own_submissions(AUTHOR, ORG)["submissions"][0]["review_count"] == 0


def test_reuse_requires_author_permission_and_explicit_non_overwriting_import(sharing):
    shared = card(sharing)
    before = sharing.states.load(VOTERS[0], ORG)
    permission = sharing.request_reuse(VOTERS[0], ORG, shared["id"])
    assert sharing.request_reuse(VOTERS[0], ORG, shared["id"])["id"] == permission["id"]
    with pytest.raises(CommunityError):
        sharing.import_reuse(VOTERS[0], ORG, permission["id"], activity_hash(""))
    with pytest.raises(CommunityError):
        sharing.respond_reuse(VOTERS[0], ORG, permission["id"], "accept")
    sharing.respond_reuse(AUTHOR, ORG, permission["id"], "accept")
    assert sharing.states.load(VOTERS[0], ORG).state == before.state
    imported = sharing.import_reuse(VOTERS[0], ORG, permission["id"], activity_hash(""))
    assert imported["state"]["activityDrafts"]["fisico-3"] == ACTIVITY
    assert imported["state"]["activityCompletions"] == {}
    assert imported["validationReceipts"] == {}
    with pytest.raises(CommunityError, match="destination activity changed"):
        sharing.import_reuse(VOTERS[0], ORG, permission["id"], activity_hash(""))
    assert sharing.reuse_list(AUTHOR, ORG)["requests"][0]["status"] == "accepted"


def test_decline_hide_disconnect_and_cross_org_revoke_card_and_import_access(sharing):
    shared = card(sharing)
    permission = sharing.request_reuse(VOTERS[0], ORG, shared["id"])
    sharing.respond_reuse(AUTHOR, ORG, permission["id"], "decline")
    with pytest.raises(CommunityError):
        sharing.import_reuse(VOTERS[0], ORG, permission["id"], activity_hash(""))
    with pytest.raises(CommunityError):
        sharing.request_reuse(AUTHOR, ORG, shared["id"])
    with pytest.raises(CommunityError):
        sharing.react(VOTERS[0], "synthetic-other-org", shared["id"], "sun")
    with pytest.raises(CommunityError):
        sharing.hide_card(VOTERS[0], ORG, shared["id"])
    sharing.hide_card(AUTHOR, ORG, shared["id"])
    assert sharing.feed(VOTERS[0], ORG) == {"cards": []}
    with pytest.raises(CommunityError):
        sharing.react(VOTERS[0], ORG, shared["id"], "sun")
    assert sharing.reuse_list(VOTERS[0], ORG) == {"requests": []}


def test_local_ideas_with_zero_eligible_contacts_do_not_fabricate_delivery(sharing):
    before = sharing.notices(VOTERS[0], ORG)
    requested = sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))
    assert requested["eligible_count"] == 0 and requested["offers"] == []
    assert sharing.notices(VOTERS[0], ORG) == before
    assert sharing.list_ideas(VOTERS[0], ORG) == {"requests": []}
    with pytest.raises(CommunityError):
        sharing.offer_idea(VOTERS[0], ORG, requested["id"])
    assert sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))["id"] == requested["id"]


def test_local_idea_uses_only_real_next_level_connected_members_saved_source_activity(sharing):
    responder = VOTERS[0]
    source_practice = "A real saved routine from this synthetic connected member"
    current = sharing.states.load(responder, ORG)
    sharing.states.save(responder, ORG, {"levels": {"fisico": 4}, "activityDrafts": {"fisico-3": source_practice, "fisico-4": "Do not offer the next-level task instead"}}, current.revision)
    original = sharing.states.load(AUTHOR, ORG)
    requested = sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))
    assert requested["eligible_count"] == 1
    assert sharing.list_ideas(responder, ORG)["requests"][0]["can_offer"] is True
    notice = next(row for row in sharing.notices(responder, ORG)["notifications"] if row["kind"] == "local_idea_requested")
    assert notice["resource_id"] == requested["id"]
    offer = sharing.offer_idea(responder, ORG, requested["id"])
    assert sharing.offer_idea(responder, ORG, requested["id"])["id"] == offer["id"]
    own = sharing.list_ideas(AUTHOR, ORG)["requests"][0]
    assert own["offers"][0]["activity"] == source_practice
    assert sharing.states.load(AUTHOR, ORG).state == original.state
    with pytest.raises(CommunityError):
        sharing.import_idea(VOTERS[1], ORG, offer["id"], activity_hash(""))
    with pytest.raises(CommunityError):
        sharing.import_idea(AUTHOR, ORG, offer["id"], activity_hash(""))
    result = sharing.import_idea(AUTHOR, ORG, offer["id"], activity_hash(ACTIVITY))
    assert result["state"]["activityDrafts"]["fisico-3"] == source_practice
    assert result["state"]["levels"] == original.state["levels"]
    assert result["state"]["presets"] == original.state["presets"]
    assert "fisico-3" not in result["state"]["activityCompletions"]
    assert result["validationReceipts"] == {}


def test_local_idea_cancellation_and_optout_revoke_future_access(sharing):
    responder = VOTERS[0]
    current = sharing.states.load(responder, ORG)
    sharing.states.save(responder, ORG, {"levels": {"fisico": 4}, "activityDrafts": {"fisico-3": "An actual saved source practice"}}, current.revision)
    requested = sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))
    offer = sharing.offer_idea(responder, ORG, requested["id"])
    sharing.set_profile(responder, ORG, "Private", "", False)
    assert sharing.list_ideas(AUTHOR, ORG)["requests"][0]["offers"] == []
    with pytest.raises(CommunityError):
        sharing.import_idea(AUTHOR, ORG, offer["id"], activity_hash(ACTIVITY))
    sharing.set_profile(responder, ORG, "Visible", "", True)
    sharing.cancel_idea(AUTHOR, ORG, requested["id"])
    assert sharing.list_ideas(responder, ORG) == {"requests": []}
    with pytest.raises(CommunityError):
        sharing.import_idea(AUTHOR, ORG, offer["id"], activity_hash(ACTIVITY))


@pytest.mark.parametrize("empty", ["\ufeff", " \ufeff\u3000"])
def test_normalization_empty_share_and_idea_offer_are_rejected(sharing, empty):
    current = sharing.states.load(AUTHOR, ORG)
    sharing.states.save(AUTHOR, ORG, {"activityDrafts": {**current.state["activityDrafts"], "fisico-3": empty}}, current.revision)
    with pytest.raises(CommunityError):
        sharing.share(AUTHOR, ORG, ActivityShareInput(mode="fisico", level=3, expected_activity_hash=activity_hash(empty)))
    current = sharing.states.load(VOTERS[0], ORG)
    sharing.states.save(VOTERS[0], ORG, {"levels": {"fisico": 4}, "activityDrafts": {"fisico-3": empty}}, current.revision)
    requested = sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))
    with pytest.raises(CommunityError, match="real activity"):
        sharing.offer_idea(VOTERS[0], ORG, requested["id"])


def test_bom_wrapped_shared_activities_and_idea_offers_use_same_hash(sharing):
    current = sharing.states.load(AUTHOR, ORG)
    sharing.states.save(AUTHOR, ORG, {"activityDrafts": {**current.state["activityDrafts"], "fisico-3": "\ufeff" + ACTIVITY + "\ufeff"}}, current.revision)
    assert card(sharing)["activity"] == ACTIVITY
    current = sharing.states.load(VOTERS[0], ORG)
    sharing.states.save(VOTERS[0], ORG, {"levels": {"fisico": 4}, "activityDrafts": {"fisico-3": "\ufeffA saved source activity\ufeff"}}, current.revision)
    requested = sharing.create_idea(AUTHOR, ORG, IdeaRequestInput(mode="fisico", level=3))
    offer = sharing.offer_idea(VOTERS[0], ORG, requested["id"])
    result = sharing.import_idea(AUTHOR, ORG, offer["id"], activity_hash(ACTIVITY))
    assert result["state"]["activityDrafts"]["fisico-3"] == "A saved source activity"
