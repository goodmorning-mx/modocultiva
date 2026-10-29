"""Synthetic network/public publication tests; no real accounts or providers."""
from copy import deepcopy
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
from types import SimpleNamespace
from uuid import UUID, uuid4

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import MetaData, create_engine, event, func, insert, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.pool import StaticPool

from app.community_media import CommunityMediaStore
from app.community_rules import ActivityShareInput, AudienceInput, SubmissionInput, activity_hash
from app.community_schema import COMMUNITY_V1_TABLES, feed_cards, media_assets, metadata, profiles, receipts, reviews, submissions, user_states
from app.community_sharing import CommunitySharingService
from app.community_state import CommunityStateStore
from app.community_status import community_storage_ready
from test_community_foundation import png
from test_community_media import mp4
from test_community_service import ACTIVITY, VOTERS, payload, vote
from test_community_state import AUTHOR, ORG, existing_state

STRANGER = "synthetic-unconnected"
OUTSIDER = "synthetic-outsider"
OTHER_ORG = "synthetic-other-org"


@pytest.fixture
def audience_api(monkeypatch):
    from app import main
    engine = create_engine("sqlite+pysqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    @event.listens_for(engine, "connect")
    def foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    metadata.create_all(engine)
    with engine.begin() as connection:
        for org in (ORG, OTHER_ORG):
            connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=org, slug=org, name=org, created_at=datetime.now(timezone.utc)))
        for actor in [AUTHOR, *VOTERS, STRANGER, OUTSIDER]:
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=actor, email=f"{actor}@example.test", name=actor, password_hash="synthetic-not-a-real-hash", is_active=True, created_at=datetime.now(timezone.utc)))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=actor, organization_id=OTHER_ORG if actor == OUTSIDER else ORG, roles=[], permissions=[], created_at=datetime.now(timezone.utc)))
        connection.execute(insert(user_states).values(user_id=AUTHOR, organization_id=ORG, state=existing_state(), updated_at=datetime.now(timezone.utc)))
    service = CommunitySharingService(engine)
    for actor in [AUTHOR, *VOTERS, STRANGER, OUTSIDER]:
        service.set_profile(actor, OTHER_ORG if actor == OUTSIDER else ORG, "A public display name", "Private bio must not leak", True)
    for voter in VOTERS:
        invitation = service.request_connection(AUTHOR, ORG, voter)
        service.change_connection(voter, ORG, invitation["id"], "accept")
    actor = [AUTHOR]
    def identity():
        if actor[0] is None:
            raise HTTPException(status_code=401, detail="Authentication required")
        return SimpleNamespace(user_id=actor[0], organization_id=OTHER_ORG if actor[0] == OUTSIDER else ORG)
    monkeypatch.setattr(main, "community_service", service)
    monkeypatch.setattr(main, "community_media_store", CommunityMediaStore(engine))
    monkeypatch.setattr(main, "user_state_store", CommunityStateStore(engine))
    main.app.dependency_overrides[main.identity_required] = identity
    try:
        with TestClient(main.app) as client:
            yield client, actor, service, engine
    finally:
        main.app.dependency_overrides.pop(main.identity_required, None)
        engine.dispose()


def publish(client, *, public=False, evidence=None):
    body = payload().model_dump(mode="json")
    body.update(audience="public" if public else "network", public_confirmed=public)
    if evidence:
        body["evidence"] = evidence
    response = client.post("/community/submissions", json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_network_public_network_revocation_and_exact_detail_allowlist(audience_api):
    client, actor, service, engine = audience_api
    before = service.states.load(AUTHOR, ORG)
    submission = publish(client)
    identifier = submission["shared_card_id"]
    assert submission["audience"] == "network"
    public_url, auth_url = f"/community/public/cards/{identifier}", f"/community/cards/{identifier}"
    actor[0] = None
    assert client.get(public_url).status_code == 404
    assert client.get(auth_url).status_code == 401
    actor[0] = STRANGER
    assert client.get(auth_url).status_code == 404
    actor[0] = VOTERS[0]
    assert client.get(auth_url).json()["proof"] == {"kind": "photo", "image": png()}
    actor[0] = AUTHOR
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "public"}).status_code == 422
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "public", "public_confirmed": True}).status_code == 200
    actor[0] = None
    response = client.get(public_url)
    assert response.status_code == 200
    detail = response.json()
    assert set(detail) == {"id", "author_id", "mode", "source_level", "activity", "activity_hash", "created_at", "display_name", "reactions", "my_reaction", "reuse", "audience", "has_evidence", "review_count", "review_quorum", "proof", "reflection", "rubric_snapshot", "target_alignment", "validation_status"}
    assert detail["proof"] == {"kind": "photo", "image": png()}
    assert detail["review_count"] == 0 and detail["review_quorum"] == 3
    assert detail["my_reaction"] is None and detail["reuse"] is None
    for forbidden in ("video_asset_id", "reviewer_id", "feedback", "email", "activityDrafts", "visionImages", "presets", "submission_id", "organization_id"):
        assert forbidden not in response.text
    assert "no-store" in response.headers["cache-control"]
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in response.headers["content-security-policy"]
    actor[0] = OUTSIDER
    assert client.get(auth_url).status_code == 200, "Public reads do not grant cross-org mutation authority"
    actor[0] = AUTHOR
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "network"}).status_code == 200
    actor[0] = None
    assert client.get(public_url).status_code == 404
    actor[0] = STRANGER
    assert client.get(auth_url).status_code == 404
    actor[0] = VOTERS[0]
    assert client.get(auth_url).status_code == 200
    assert service.states.load(AUTHOR, ORG).state == before.state


@pytest.mark.parametrize("bad", [{"audience": "public"}, {"audience": "public", "public_confirmed": False}, {"audience": "public", "public_confirmed": "true"}, {"audience": "public", "public_confirmed": 1}, {"audience": "everyone", "public_confirmed": True}])
def test_public_requires_explicit_strict_boolean_in_every_input(bad):
    for build in (lambda: AudienceInput(**bad), lambda: SubmissionInput(**{**payload().model_dump(mode="json"), **bad}), lambda: ActivityShareInput(mode="fisico", level=3, expected_activity_hash=activity_hash(ACTIVITY), **bad)):
        with pytest.raises(ValidationError):
            build()


def test_public_submission_is_atomic_and_identical_retry_updates_only_choice(audience_api, monkeypatch):
    client, actor, service, engine = audience_api
    original = service.publish_card
    monkeypatch.setattr(service, "publish_card", lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("synthetic publication failure")))
    with pytest.raises(RuntimeError):
        service.submit(AUTHOR, ORG, payload())
    with engine.begin() as connection:
        assert connection.execute(select(func.count()).select_from(submissions)).scalar_one() == 0
        assert connection.execute(select(func.count()).select_from(feed_cards)).scalar_one() == 0
    monkeypatch.setattr(service, "publish_card", original)
    submission = publish(client, public=True)
    retry = publish(client, public=False)
    assert retry["id"] == submission["id"] and retry["shared_card_id"] == submission["shared_card_id"]
    assert retry["audience"] == "network"
    with engine.begin() as connection:
        assert connection.execute(select(func.count()).select_from(submissions)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(feed_cards)).scalar_one() == 1


def test_public_video_uses_card_not_global_asset_id_and_revokes_immediately(audience_api):
    client, actor, service, engine = audience_api
    uploaded = client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4"})
    assert uploaded.status_code == 201
    asset = uploaded.json()
    actor[0] = VOTERS[0]
    assert client.get(f"/community/media/{asset['id']}").status_code == 404, "Draft upload stays owner-only"
    actor[0] = AUTHOR
    submission = publish(client, public=True, evidence={"video_asset_id": asset["id"], "reflection": "An explicit account of performing this uploaded activity.", "link": "https://example.test/context"})
    identifier = submission["shared_card_id"]
    actor[0] = None
    detail = client.get(f"/community/public/cards/{identifier}").json()
    assert detail["proof"] == {"kind": "video", "mime_type": "video/mp4", "byte_size": len(mp4())}
    assert detail["reference_link"] == "https://example.test/context"
    assert asset["id"] not in str(detail)
    video = client.get(f"/community/public/cards/{identifier}/video")
    assert video.content == mp4() and video.headers["content-type"] == "video/mp4"
    assert video.headers["content-length"] == str(len(mp4()))
    assert "no-store" in video.headers["cache-control"] and "sandbox" in video.headers["content-security-policy"]
    assert client.get(f"/community/media/{asset['id']}").status_code == 401
    actor[0] = STRANGER
    assert client.get(f"/community/cards/{identifier}/video").content == mp4()
    assert client.get(f"/community/media/{asset['id']}").status_code == 404
    actor[0] = AUTHOR
    client.put(f"/community/feed/{identifier}/audience", json={"audience": "network"})
    actor[0] = None
    assert client.get(f"/community/public/cards/{identifier}/video").status_code == 404
    actor[0] = STRANGER
    assert client.get(f"/community/cards/{identifier}/video").status_code == 404
    actor[0] = VOTERS[0]
    assert client.get(f"/community/cards/{identifier}/video").content == mp4()
    actor[0] = AUTHOR
    client.post(f"/community/feed/{identifier}/hide")
    actor[0] = VOTERS[0]
    assert client.get(f"/community/cards/{identifier}/video").status_code == 404


@pytest.mark.parametrize("revocation", ["hidden", "optout", "inactive", "draft_changed", "withdrawn", "superseded", "stale", "wrong_hash", "wrong_source", "not_latest"])
@pytest.mark.parametrize("visual", ["photo", "video"])
def test_public_revocation_checks_every_current_proof_boundary(audience_api, revocation, visual):
    client, actor, service, engine = audience_api
    evidence = None
    if visual == "video":
        asset = client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4"}).json()
        evidence = {"video_asset_id": asset["id"], "reflection": "An explicit account of performing this uploaded activity."}
    submission = publish(client, public=True, evidence=evidence)
    identifier = submission["shared_card_id"]
    if revocation == "hidden":
        client.post(f"/community/feed/{identifier}/hide")
    elif revocation == "optout":
        service.set_profile(AUTHOR, ORG, "Synthetic", "", False)
    elif revocation == "inactive":
        with engine.begin() as connection:
            connection.execute(update(metadata.tables["gm_auth_users"]).where(metadata.tables["gm_auth_users"].c.id == AUTHOR).values(is_active=False))
    elif revocation == "draft_changed":
        current = service.states.load(AUTHOR, ORG)
        service.states.save(AUTHOR, ORG, {"activityDrafts": {**current.state["activityDrafts"], "fisico-3": "Different current practice"}}, current.revision)
    elif revocation in {"withdrawn", "superseded", "stale"}:
        with engine.begin() as connection:
            connection.execute(update(submissions).where(submissions.c.id == submission["id"]).values(status=revocation))
    elif revocation in {"wrong_hash", "wrong_source"}:
        with engine.begin() as connection:
            connection.execute(update(feed_cards).where(feed_cards.c.id == identifier).values(**({"activity_hash": "0" * 64} if revocation == "wrong_hash" else {"source_level": 2})))
    else:
        with engine.begin() as connection:
            row = dict(connection.execute(select(submissions).where(submissions.c.id == submission["id"])).mappings().one())
            row.update(id=str(uuid4()), revision_number=2, status="withdrawn")
            connection.execute(insert(submissions).values(**row))
    actor[0] = None
    assert client.get(f"/community/public/cards/{identifier}").status_code == 404
    if visual == "video":
        assert client.get(f"/community/public/cards/{identifier}/video").status_code == 404
    if revocation not in {"optout", "inactive"}:
        actor[0] = VOTERS[0]
        assert client.get(f"/community/cards/{identifier}").status_code == 404
        if visual == "video":
            assert client.get(f"/community/cards/{identifier}/video").status_code == 404


def test_public_is_view_only_and_reviews_remain_three_distinct_network_members(audience_api):
    client, actor, service, engine = audience_api
    submission = publish(client, public=True)
    identifier, review_url = submission["shared_card_id"], f"/community/submissions/{submission['id']}/reviews"
    body = vote().model_dump(mode="json")
    actor[0] = None
    for method, url, content in [("post", review_url, body), ("post", "/community/feed", {}), ("put", f"/community/feed/{identifier}/audience", {"audience": "network"}), ("put", f"/community/feed/{identifier}/reaction", {"reaction": "leaf"}), ("post", f"/community/feed/{identifier}/reuse", {})]:
        assert getattr(client, method)(url, json=content).status_code == 401
    for member in (AUTHOR, STRANGER, OUTSIDER):
        actor[0] = member
        assert client.post(review_url, json=body).status_code == 403
    actor[0] = STRANGER
    assert identifier in [card["id"] for card in client.get("/community/feed").json()["cards"]]
    assert client.post(f"/community/feed/{identifier}/reuse").status_code == 404
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "network"}).status_code == 404
    for index, voter in enumerate(VOTERS, 1):
        actor[0] = voter
        result = client.post(review_url, json=body)
        assert result.status_code == 200 and result.json()["review_count"] == index
        assert client.post(review_url, json=body).json()["review_count"] == index
    actor[0] = None
    public = client.get(f"/community/public/cards/{identifier}").json()
    assert public["review_count"] == 3 and public["validation_status"] == "approved"
    assert "reviews" not in public and "feedback" not in str(public)
    assert service.states.load(AUTHOR, ORG).state["levels"]["fisico"] == 4


def test_explicit_share_proof_ownership_and_legacy_activity_only_defaults(audience_api):
    client, actor, service, engine = audience_api
    share = {"mode": "fisico", "level": 3, "expected_activity_hash": activity_hash(ACTIVITY)}
    legacy = client.post("/community/feed", json=share).json()
    assert legacy["audience"] == "network" and legacy["has_evidence"] is False
    assert client.post("/community/feed", json={**share, "audience": "public", "public_confirmed": True}).status_code == 201
    submission = publish(client)
    assert submission["shared_card_id"] == legacy["id"]
    with engine.begin() as connection:
        connection.execute(update(user_states).where(user_states.c.user_id == STRANGER).values(state={"activityDrafts": {"fisico-3": ACTIVITY}}))
    actor[0] = STRANGER
    assert client.post("/community/feed", json={**share, "audience": "public", "public_confirmed": True, "submission_id": submission["id"]}).status_code == 422
    actor[0] = AUTHOR
    assert client.post("/community/feed", json={**share, "audience": "public", "public_confirmed": True, "submission_id": submission["id"]}).status_code == 201
    actor[0] = None
    assert client.get(f"/community/public/cards/{legacy['id']}").status_code == 200


def test_explicit_text_only_public_choice_has_no_proof_and_network_revokes(audience_api):
    client, actor, service, engine = audience_api
    before = service.states.load(AUTHOR, ORG)
    # Even an existing owner/network proof is not selected implicitly by sharing
    # activity text. No reflection, rubric or asset may be inferred from it.
    submission = publish(client)
    body = {"mode": "fisico", "level": 3, "expected_activity_hash": activity_hash(ACTIVITY), "audience": "public", "public_confirmed": True}
    response = client.post("/community/feed", json=body)
    assert response.status_code == 201
    card = response.json()
    assert card["id"] == submission["shared_card_id"] and card["has_evidence"] is False
    identifier = card["id"]
    public_url, auth_url = f"/community/public/cards/{identifier}", f"/community/cards/{identifier}"
    actor[0] = None
    response = client.get(public_url)
    assert response.status_code == 200
    detail = response.json()
    assert detail["activity"] == ACTIVITY and detail["audience"] == "public"
    assert detail["review_count"] == 0 and detail["review_quorum"] == 3
    assert set(detail) == {"id", "author_id", "mode", "source_level", "activity", "activity_hash", "created_at", "display_name", "reactions", "my_reaction", "reuse", "audience", "has_evidence", "review_count", "review_quorum"}
    assert client.get(f"{public_url}/video").status_code == 404
    actor[0] = OUTSIDER
    assert client.get(auth_url).status_code == 200
    actor[0] = AUTHOR
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "network"}).status_code == 200
    actor[0] = None
    assert client.get(public_url).status_code == 404
    actor[0] = STRANGER
    assert client.get(auth_url).status_code == 404
    actor[0] = VOTERS[0]
    assert client.get(auth_url).status_code == 200
    actor[0] = AUTHOR
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "public"}).status_code == 422
    assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "public", "public_confirmed": True}).status_code == 200
    assert service.states.load(AUTHOR, ORG).state == before.state


@pytest.mark.parametrize("revocation", ["hidden", "optout", "inactive", "draft_changed", "wrong_hash", "wrong_text", "empty"])
def test_text_only_public_requires_exact_current_saved_activity(audience_api, revocation):
    client, actor, service, engine = audience_api
    card = client.post("/community/feed", json={"mode": "fisico", "level": 3, "expected_activity_hash": activity_hash(ACTIVITY), "audience": "public", "public_confirmed": True}).json()
    identifier = card["id"]
    assert client.get(f"/community/public/cards/{identifier}").status_code == 200
    state = deepcopy(service.states.load(AUTHOR, ORG).state)
    with engine.begin() as connection:
        if revocation == "hidden":
            connection.execute(update(feed_cards).where(feed_cards.c.id == identifier).values(visible=False))
        elif revocation == "optout":
            connection.execute(update(profiles).where(profiles.c.user_id == AUTHOR).values(discoverable=False))
        elif revocation == "inactive":
            connection.execute(update(metadata.tables["gm_auth_users"]).where(metadata.tables["gm_auth_users"].c.id == AUTHOR).values(is_active=False))
        elif revocation in {"draft_changed", "empty"}:
            state["activityDrafts"]["fisico-3"] = "A different activity" if revocation == "draft_changed" else "\ufeff\u00a0"
            connection.execute(update(user_states).where(user_states.c.user_id == AUTHOR).values(state=state))
        else:
            connection.execute(update(feed_cards).where(feed_cards.c.id == identifier).values(**({"activity_hash": "0" * 64} if revocation == "wrong_hash" else {"activity": "Different shared text"})))
    actor[0] = None
    assert client.get(f"/community/public/cards/{identifier}").status_code == 404
    actor[0] = OUTSIDER
    assert client.get(f"/community/cards/{identifier}").status_code == 404
    actor[0] = AUTHOR
    if revocation not in {"hidden", "optout", "inactive"}:
        assert client.put(f"/community/feed/{identifier}/audience", json={"audience": "public", "public_confirmed": True}).status_code == 409


def test_database_scoped_link_rejects_another_author_or_org(audience_api):
    client, actor, service, engine = audience_api
    submission = publish(client)
    for author, org in ((STRANGER, ORG), (OUTSIDER, OTHER_ORG)):
        with pytest.raises(IntegrityError), engine.begin() as connection:
            connection.execute(insert(feed_cards).values(id=str(uuid4()), author_id=author, organization_id=org, mode="fisico", source_level=3, activity=ACTIVITY, activity_hash=activity_hash(ACTIVITY), visible=True, submission_id=submission["id"]))


def test_v2_storage_is_not_ready_without_v3_columns():
    projection = MetaData()
    for table in COMMUNITY_V1_TABLES[0].metadata.sorted_tables:
        table.to_metadata(projection)
    media_assets.to_metadata(projection)
    engine = create_engine("sqlite+pysqlite:///:memory:")
    try:
        projection.create_all(engine)
        assert community_storage_ready(engine) is False
    finally:
        engine.dispose()


def test_migration003_is_additive_frozen_guarded_and_never_publishes_existing_rows(monkeypatch):
    path = Path(__file__).parents[1] / "alembic" / "versions" / "202610290003_card_evidence_audience.py"
    spec = importlib.util.spec_from_file_location("synthetic_card_audience_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.down_revision == "202610290002"
    assert "DEFAULT 'network' NOT NULL" in module.SCHEMA_V3[0]
    assert all(statement.startswith(("ALTER TABLE modocultiva_shared_cards ADD ", "CREATE INDEX ix_community_cards_")) for statement in module.SCHEMA_V3)
    assert "FOREIGN KEY (submission_id, organization_id, author_id)" in module.SCHEMA_V3[3]
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(app_env="production"))
    with pytest.raises(RuntimeError, match="only for development"):
        module.upgrade()
    with pytest.raises(RuntimeError, match="must not be dropped"):
        module.downgrade()
