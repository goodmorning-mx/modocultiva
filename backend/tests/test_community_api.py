from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, insert
from sqlalchemy.pool import StaticPool

from app.community_media import CommunityMediaStore
from app.community_schema import metadata, user_states
from app.community_service import CommunityService
from app.community_state import CommunityStateStore
from app.community_rules import activity_hash
from test_community_foundation import png
from test_community_state import AUTHOR, ORG, existing_state


@pytest.fixture
def api(monkeypatch):
    from app import main
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    metadata.create_all(engine)
    actor = [AUTHOR]
    voters = [f"synthetic-reviewer-{i}" for i in (1, 2, 3)]
    with engine.begin() as connection:
        connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=ORG, slug=ORG, name=ORG, created_at=datetime.now(timezone.utc)))
        for member in [AUTHOR, *voters]:
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=member, email=f"{member}@example.test", name=member, password_hash="synthetic-not-authenticated-via-password", is_active=True, created_at=datetime.now(timezone.utc)))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=member, organization_id=ORG, roles=[], permissions=[], created_at=datetime.now(timezone.utc)))
        connection.execute(insert(user_states).values(user_id=AUTHOR, organization_id=ORG, state=existing_state(), updated_at=datetime.now(timezone.utc)))
    monkeypatch.setattr(main, "user_state_store", CommunityStateStore(engine))
    monkeypatch.setattr(main, "community_service", CommunityService(engine))
    monkeypatch.setattr(main, "community_media_store", CommunityMediaStore(engine))
    main.app.dependency_overrides[main.identity_required] = lambda: SimpleNamespace(user_id=actor[0], organization_id=ORG)
    try:
        with TestClient(main.app) as client:
            yield client, actor, voters
    finally:
        main.app.dependency_overrides.pop(main.identity_required, None)
        engine.dispose()


def test_http_real_transaction_flow_and_stale_save_protection(api):
    client, actor, voters = api
    before = client.get("/state")
    assert before.status_code == 200
    assert "no-store" in before.headers["cache-control"]
    original = before.json()
    assert original["state"] == existing_state()
    for member in [AUTHOR, *voters]:
        actor[0] = member
        result = client.put("/community/profile", json={"display_name": "Synthetic member", "bio": "", "discoverable": True})
        assert result.status_code == 200
    actor[0] = AUTHOR
    for member in voters:
        invite = client.post("/community/connections", json={"member_id": member})
        assert invite.status_code == 201
        actor[0] = member
        assert client.put(f"/community/connections/{invite.json()['id']}", json={"action": "accept"}).status_code == 200
        actor[0] = AUTHOR
    activity = existing_state()["activityDrafts"]["fisico-3"]
    submission = {"mode": "fisico", "level": 3, "language": "es", "expected_activity_hash": activity_hash(activity), "evidence": {"reflection": "I performed the routine and documented the minimum structure.", "image": png()}, "target_alignment": "This routine demonstrates the minimum structure of the following clarity level."}
    assert client.post("/community/submissions", json={**submission, "author_id": voters[0]}).status_code == 422
    assert client.post("/community/submissions", json={**submission, "evidence": {"reflection": "A text without visual proof must never suffice."}}).status_code == 422
    result = client.post("/community/submissions", json=submission)
    assert result.status_code == 201
    identifier = result.json()["id"]
    review = {"expected_activity_hash": activity_hash(activity), "decision": "approve", "activity_match": True, "effort_match": True, "clarity_match": True}
    assert client.post(f"/community/submissions/{identifier}/reviews", json=review).status_code == 403
    for index, member in enumerate(voters, 1):
        actor[0] = member
        inbox = client.get("/community/review-inbox")
        assert inbox.status_code == 200 and inbox.json()["submissions"][0]["id"] == identifier
        result = client.post(f"/community/submissions/{identifier}/reviews", json=review)
        assert result.status_code == 200 and result.json()["review_count"] == index
    actor[0] = AUTHOR
    stale = client.put("/state", json={"state": original["state"], "expected_revision": original["revision"]})
    assert stale.status_code == 409
    assert stale.json()["detail"]["code"] == "state_conflict"
    latest = stale.json()
    assert latest["state"]["levels"]["fisico"] == 4
    assert latest["validationReceipts"]["fisico-3"]["reviewerCount"] == 3
    changed = {**latest["state"], "profileName": "A subsequent profile edit"}
    saved = client.put("/state", json={"state": changed, "expected_revision": latest["revision"]})
    assert saved.status_code == 200
    assert saved.json()["state"]["levels"]["fisico"] == 4
    assert saved.json()["state"]["presets"] == original["state"]["presets"]
    assert len(saved.json()["state"]["levels"]) == 12
    assert saved.json()["state"]["visionImages"] == original["state"]["visionImages"]
    assert client.get("/community/submissions").json()["submissions"][0]["status"] == "approved"


def test_legacy_missing_revision_cannot_overwrite_map_but_is_retryable(api):
    client, actor, voters = api
    rejected = client.put("/state", json={"state": {"profileName": "Do not silently replace cloud"}})
    assert rejected.status_code == 409
    assert rejected.json()["state"] == existing_state()
    retry = client.put("/state", json={"state": {"profileName": "Explicit revision-aware edit"}, "expected_revision": rejected.json()["revision"]})
    assert retry.status_code == 200
    assert retry.json()["state"]["presets"] == existing_state()["presets"]
