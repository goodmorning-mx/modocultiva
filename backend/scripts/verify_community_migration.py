"""CI-only preservation check against a fresh, explicitly named local test DB.

No cleanup/drop, production URL, external account, provider call or secret output.
The caller supplies an ephemeral PostgreSQL16 service. Refuse any other target.
"""
import json
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import make_url


def validate_test_target(value):
    if not value:
        raise RuntimeError("Set the dedicated local migration test URL; no default database is used.")
    url = make_url(value)
    if url.get_backend_name() != "postgresql" or url.host not in {"127.0.0.1", "localhost"} or url.database != "modocultiva_community_migration_test" or url.query or url.username != "synthetic_migration_user" or url.port not in {None, 5432}:
        raise RuntimeError("Migration test refuses any database except the explicitly named local synthetic test DB.")
    return url


def guard_test_engine(engine):
    """Every direct concurrency entry point refuses a product/default engine."""
    validate_test_target(engine.url)
    if os.environ.get("APP_ENV", "").strip().lower() != "test" or engine.dialect.name != "postgresql":
        raise RuntimeError("Concurrency verification requires APP_ENV=test and PostgreSQL16.")
    with engine.connect() as connection:
        version = int(connection.exec_driver_sql("SHOW server_version_num").scalar_one())
    if not 160000 <= version < 170000:
        raise RuntimeError("Concurrency verification requires the dedicated PostgreSQL16 service.")


def main():
    value = os.environ.get("COMMUNITY_MIGRATION_TEST_URL", "")
    validate_test_target(value)
    os.environ["APP_ENV"] = "test"
    engine = create_engine(value, connect_args={"options": "-c statement_timeout=15000 -c lock_timeout=6000"})
    guard_test_engine(engine)
    if inspect(engine).get_table_names():
        raise RuntimeError("Migration preservation check requires a fresh empty test database; existing data will not be reset.")
    os.environ["DATABASE_URL"] = value
    os.environ["APP_ENV"] = "test"
    from app.config import get_settings
    get_settings.cache_clear()
    config = Config(str(Path(__file__).parents[1] / "alembic.ini"))
    config.set_main_option("script_location", str(Path(__file__).parents[1] / "alembic"))
    command.upgrade(config, "202609300001")
    modes = ["fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"]
    levels = {mode: index % 10 for index, mode in enumerate(modes)}
    original = {"profileName": "Synthetic existing account", "levels": levels,
                "presets": {"Existing complete map": levels}, "selectedPreset": "Existing complete map",
                "activityDrafts": {"fisico-3": "Synthetic saved activity"},
                "activityCompletions": {"fisico-3": "0123456789abcdef"},
                "activityReactions": {"fisico-3-0123456789abcdef": "leaf"},
                "visionImages": {"visionario": "data:image/png;base64,synthetic-existing-image"},
                "featuredBadges": ["first-step"], "language": "es", "skin": "holista"}
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO modocultiva_user_state(user_id,organization_id,state,updated_at) VALUES ('synthetic-user','synthetic-organization',CAST(:state AS jsonb),'2026-01-01T00:00:00Z')"), {"state": json.dumps(original)})
        before = connection.execute(text("SELECT state,updated_at FROM modocultiva_user_state")).mappings().one()
    command.upgrade(config, "202610290002")
    # A genuine pre-003 card: no audience/proof columns exist yet. Seed only
    # synthetic auth parents, not another product state/control row.
    with engine.begin() as connection:
        connection.execute(text("INSERT INTO gm_auth_organizations(id,slug,name,created_at) VALUES ('synthetic-v2-org','synthetic-v2-org','Synthetic v2',now())"))
        connection.execute(text("INSERT INTO gm_auth_users(id,email,name,password_hash,is_active,created_at) VALUES ('synthetic-v2-author','synthetic-v2@example.test','Synthetic v2','synthetic-not-a-real-hash',true,now())"))
        connection.execute(text("INSERT INTO gm_auth_memberships(user_id,organization_id,roles,permissions,created_at) VALUES ('synthetic-v2-author','synthetic-v2-org','[]'::jsonb,'[]'::jsonb,now())"))
        connection.execute(text("INSERT INTO modocultiva_shared_cards(id,organization_id,author_id,mode,source_level,activity,activity_hash,visible,created_at) VALUES ('00000000-0000-4000-8000-000000000003','synthetic-v2-org','synthetic-v2-author','fisico',3,'Pre003 network activity',:digest,true,'2026-01-01T00:00:00Z')"), {"digest": "0" * 64})
        old_card = dict(connection.execute(text("SELECT * FROM modocultiva_shared_cards WHERE id='00000000-0000-4000-8000-000000000003'")).mappings().one())
    from app.community_status import community_storage_ready
    assert not community_storage_ready(engine), "V2 tables alone must not claim audience readiness"
    command.upgrade(config, "head")
    from app.community_schema import COMMUNITY_TABLES
    assert {table.name for table in COMMUNITY_TABLES}.issubset(set(inspect(engine).get_table_names()))
    with engine.begin() as connection:
        after = connection.execute(text("SELECT state,updated_at FROM modocultiva_user_state")).mappings().one()
        control = connection.execute(text("SELECT revision,legacy_snapshot FROM modocultiva_progress_controls")).mappings().one()
        assert after["state"] == original == before["state"]
        assert after["updated_at"] == before["updated_at"], "Migration must not rewrite existing rows or timestamps"
        assert control["legacy_snapshot"] == {"activityDrafts": original["activityDrafts"], "activityCompletions": original["activityCompletions"]}
        assert control["revision"]
        upgraded_card = dict(connection.execute(text("SELECT * FROM modocultiva_shared_cards WHERE id='00000000-0000-4000-8000-000000000003'")).mappings().one())
        assert upgraded_card == {**old_card, "audience": "network", "submission_id": None}, "003 must preserve the complete old card and timestamp without publishing/linking it"
    assert community_storage_ready(engine)
    card_inspector = inspect(engine)
    columns = {column["name"]: column for column in card_inspector.get_columns("modocultiva_shared_cards")}
    assert columns["audience"]["nullable"] is False and "'network'" in columns["audience"]["default"]
    assert columns["submission_id"]["nullable"] is True and columns["submission_id"]["default"] is None
    proof_fk = next(key for key in card_inspector.get_foreign_keys("modocultiva_shared_cards") if key["name"] == "fk_community_card_submission")
    assert proof_fk["constrained_columns"] == ["submission_id", "organization_id", "author_id"]
    assert proof_fk["referred_table"] == "modocultiva_evidence_submissions" and proof_fk["referred_columns"] == ["id", "organization_id", "author_id"]
    assert {"ix_community_cards_audience", "ix_community_cards_submission"}.issubset({index["name"] for index in card_inspector.get_indexes("modocultiva_shared_cards")})
    command.upgrade(config, "head")
    with engine.begin() as connection:
        again = connection.execute(text("SELECT revision,legacy_snapshot FROM modocultiva_progress_controls")).mappings().one()
        assert dict(again) == dict(control), "Repeated startup must not reset revisions/history"
        assert dict(connection.execute(text("SELECT * FROM modocultiva_shared_cards WHERE id='00000000-0000-4000-8000-000000000003'")).mappings().one()) == upgraded_card
    print("[community migration] PostgreSQL16: additive003 preserves existing all12 state/history/timestamps and pre003 cards, defaults network with no proof link/publication; repeated startup and column readiness passed")
    verify_concurrent_quorum(engine)
    verify_invitation_lock_order(engine)
    verify_reconnected_unicode_quorum(engine)
    verify_evidence_capacity_races(engine)
    engine.dispose()


def verify_concurrent_quorum(engine):
    """Actual PostgreSQL locks, not SQLite's single-process test adapter."""
    guard_test_engine(engine)
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from datetime import datetime, timezone
    from sqlalchemy import func, insert, select
    from app.community_schema import advance_claims, metadata, receipts, reviews, user_states
    from app.community_rules import ReviewInput, SubmissionInput, activity_hash
    from app.community_service import CommunityService
    from app.community_state import StateConflict
    import base64
    import binascii
    import struct
    import zlib
    def png():
        def chunk(kind, data):
            return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", binascii.crc32(kind + data) & 0xFFFFFFFF)
        content = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\x00\x80\xff\x80\xff")) + chunk(b"IEND", b"")
        return "data:image/png;base64," + base64.b64encode(content).decode()

    org, author = "synthetic-concurrent-org", "synthetic-concurrent-author"
    voters = [f"synthetic-concurrent-reviewer-{index}" for index in (1, 2, 3)]
    modes = ["fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"]
    levels = {key: index % 10 for index, key in enumerate(modes)}
    levels["fisico"] = 3
    activity = "A synthetic routine which establishes the minimum structure"
    state = {"levels": levels, "presets": {"Synthetic existing complete map": levels}, "activityDrafts": {"fisico-3": activity}, "visionImages": {"visionario": "synthetic-existing-image"}}
    with engine.begin() as connection:
        connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=org, slug=org, name=org, created_at=datetime.now(timezone.utc)))
        for actor in [author, *voters]:
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=actor, email=f"{actor}@example.test", name=actor, password_hash="synthetic-not-a-real-hash", is_active=True, created_at=datetime.now(timezone.utc)))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=actor, organization_id=org, roles=[], permissions=[], created_at=datetime.now(timezone.utc)))
        connection.execute(insert(user_states).values(user_id=author, organization_id=org, state=state, updated_at=datetime.now(timezone.utc)))
    service = CommunityService(engine)
    for actor in [author, *voters]:
        service.set_profile(actor, org, actor, "Synthetic concurrency check", True)
    for actor in voters:
        invite = service.request_connection(author, org, actor)
        service.change_connection(actor, org, invite["id"], "accept")
    stale = service.states.load(author, org)
    submission = service.submit(author, org, SubmissionInput(mode="fisico", level=3, expected_activity_hash=activity_hash(activity), evidence={"reflection": "A synthetic visual evidence preservation test.", "image": png()}, target_alignment="This routine demonstrates the minimum structure of the next clarity stage."))
    payload = ReviewInput(expected_activity_hash=activity_hash(activity), decision="approve", activity_match=True, effort_match=True, clarity_match=True)
    barrier = Barrier(6)
    def cast(actor):
        barrier.wait(timeout=10)
        return service.review(actor, org, submission["id"], payload)
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(cast, [*voters, *voters], timeout=30))
    assert any(row["status"] == "approved" for row in results)
    after = service.states.load(author, org)
    assert after.state["levels"] == {**levels, "fisico": 4}
    assert after.state["presets"] == state["presets"] and after.state["visionImages"] == state["visionImages"]
    assert after.validation_receipts["fisico-3"]["reviewerCount"] == 3
    try:
        service.states.save(author, org, stale.state, stale.revision)
    except StateConflict:
        pass
    else:
        raise AssertionError("A stale map must not undo the concurrent award")
    with engine.begin() as connection:
        assert connection.execute(select(func.count()).select_from(receipts)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(advance_claims)).scalar_one() == 1
        assert connection.execute(select(func.count()).select_from(reviews)).scalar_one() == 3
    print("[community quorum] PostgreSQL16: six concurrent requests, three distinct reviews, one receipt, one conditional advance; stale autosave rejected and all12 levels/presets/images preserved")


def _security_fixture(engine, suffix, *, activity="A saved routine towards the next minimum structure"):
    """Append synthetic members only; never reset/drop/delete database contents."""
    guard_test_engine(engine)
    from copy import deepcopy
    from datetime import datetime, timezone
    from sqlalchemy import insert
    from app.community_rules import completion_token
    from app.community_schema import metadata, user_states
    from app.community_service import CommunityService
    org, author = f"synthetic-sec-{suffix}-org", f"synthetic-sec-{suffix}-author"
    voters = [f"synthetic-sec-{suffix}-v{i}" for i in range(3)]
    modes = ["fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"]
    levels = {mode: index % 10 for index, mode in enumerate(modes)}
    levels["fisico"] = 3
    state = {"levels": levels, "presets": {"Keep all12": deepcopy(levels)}, "selectedPreset": "Keep all12",
             "activityDrafts": {"fisico-3": activity, "social-1": "Captured server history"},
             "activityCompletions": {"social-1": completion_token("Captured server history")},
             "visionImages": {"visionario": "synthetic-kept-image"}, "language": "es"}
    with engine.begin() as connection:
        connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=org, slug=org, name=org, created_at=datetime.now(timezone.utc)))
        for actor in [author, *voters]:
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=actor, email=f"{actor}@example.test", name=actor, password_hash="synthetic-not-a-real-hash", is_active=True, created_at=datetime.now(timezone.utc)))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=actor, organization_id=org, roles=[], permissions=[], created_at=datetime.now(timezone.utc)))
        connection.execute(insert(user_states).values(user_id=author, organization_id=org, state=state, updated_at=datetime.now(timezone.utc)))
    service = CommunityService(engine)
    for actor in [author, *voters]:
        service.set_profile(actor, org, actor, "Synthetic CI-only account", True)
    return service, author, org, voters, state


def _security_submission(activity):
    import base64
    import binascii
    import struct
    import zlib
    from app.community_rules import SubmissionInput, activity_hash
    def chunk(kind, data):
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", binascii.crc32(kind + data) & 0xFFFFFFFF)
    content = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(b"\x00\x80\xff\x80\xff")) + chunk(b"IEND", b"")
    return SubmissionInput(mode="fisico", level=3, expected_activity_hash=activity_hash(activity), evidence={"reflection": "A synthetic uploaded photo with an explicit context.", "image": "data:image/png;base64," + base64.b64encode(content).decode()}, target_alignment="The saved routine targets the exact next clarity description.")


def verify_invitation_lock_order(engine):
    guard_test_engine(engine)
    from concurrent.futures import ThreadPoolExecutor
    from threading import Event, local
    from sqlalchemy import event
    service, author, org, voters, _ = _security_fixture(engine, "lock")
    invitation = service.request_connection(author, org, voters[0])
    connection_locked, memberships_locked = Event(), Event()
    worker = local()
    observed = []
    def after_execute(connection, cursor, statement, parameters, context, executemany):
        role = getattr(worker, "role", None)
        if role == "accept" and "FROM modocultiva_connections" in statement and "FOR UPDATE" in statement:
            connection_locked.set()
            assert memberships_locked.wait(10), "Invitation never acquired its membership locks"
        if role == "invite" and "FROM gm_auth_memberships" in statement and "FOR " in statement:
            observed.append(statement)
            memberships_locked.set()
    def accept():
        worker.role = "accept"
        return service.change_connection(voters[0], org, invitation["id"], "accept")
    def invite():
        worker.role = "invite"
        assert connection_locked.wait(10), "Acceptance never acquired its connection lock"
        return service.request_connection(author, org, voters[0])
    event.listen(engine, "after_cursor_execute", after_execute)
    try:
        with ThreadPoolExecutor(max_workers=2) as pool:
            accepted, repeated = pool.submit(accept), pool.submit(invite)
            assert accepted.result(timeout=25)["status"] == "accepted"
            assert repeated.result(timeout=25)["status"] == "accepted"
    finally:
        event.remove(engine, "after_cursor_execute", after_execute)
    assert observed and all("FOR NO KEY UPDATE" in statement for statement in observed)
    print("[community locks] PostgreSQL16: barrier-forced invitation/acceptance FK lock interleaving completed without deadlock")


def verify_reconnected_unicode_quorum(engine):
    guard_test_engine(engine)
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from sqlalchemy import func, select
    from app.community_rules import ReviewInput, activity_hash, completion_token
    from app.community_schema import advance_claims, progress_controls, receipts, reviews, user_states
    activity = "\ufeffA saved routine towards the next minimum structure\ufeff"
    service, author, org, voters, state = _security_fixture(engine, "retry", activity=activity)
    with engine.begin() as connection:
        timestamp = connection.execute(select(user_states.c.updated_at).where(user_states.c.user_id == author)).scalar_one()
    baseline = service.states.load(author, org)
    with engine.begin() as connection:
        assert connection.execute(select(user_states.c.updated_at).where(user_states.c.user_id == author)).scalar_one() == timestamp
    imported = service.states.merge_device(author, org, {"activityCompletions": {"fisico-3": completion_token(activity)}, "activityDrafts": {"fisico-3": activity}})
    assert imported.state["activityCompletions"] == baseline.state["activityCompletions"]
    with engine.begin() as connection:
        history = connection.execute(select(progress_controls.c.legacy_snapshot).where(progress_controls.c.user_id == author)).scalar_one()
    assert history["activityCompletions"] == state["activityCompletions"]
    assert history["unverifiedDeviceHistory"]["activityCompletions"]["fisico-3"] == completion_token(activity)
    invitations = [service.request_connection(author, org, voter) for voter in voters]
    for voter, invitation in zip(voters, invitations):
        service.change_connection(voter, org, invitation["id"], "accept")
    submission = service.submit(author, org, _security_submission(activity))
    payload = ReviewInput(expected_activity_hash=activity_hash(activity), decision="approve", activity_match=True, effort_match=True, clarity_match=True)
    service.review(voters[0], org, submission["id"], payload)
    service.change_connection(author, org, invitations[0]["id"], "disconnect")
    for voter in voters[1:]:
        assert service.review(voter, org, submission["id"], payload)["status"] == "pending"
    invitation = service.request_connection(author, org, voters[0])
    accepted = service.change_connection(voters[0], org, invitation["id"], "accept")
    assert accepted["reconciled_submissions"] == 1
    assert service.read_submission(author, org, submission["id"])["status"] == "approved", "Reconnect must work without a disabled UI review retry"
    barrier = Barrier(3)
    def retry(voter):
        barrier.wait(timeout=10)
        return service.review(voter, org, submission["id"], payload)
    with ThreadPoolExecutor(max_workers=3) as pool:
        results = list(pool.map(retry, voters, timeout=30))
    assert all(row["status"] == "approved" and row["review_count"] == 3 for row in results)
    after = service.states.load(author, org)
    assert after.validation_receipts["fisico-3"]["reviewerCount"] == 3
    assert after.state == {**state, "levels": {**state["levels"], "fisico": 4}, "activityCompletions": {**state["activityCompletions"], "fisico-3": completion_token(activity)}}
    with engine.begin() as connection:
        for table in (reviews, receipts, advance_claims):
            count = connection.execute(select(func.count()).select_from(table).where(table.c.author_id == author, table.c.organization_id == org)).scalar_one()
            assert count == (3 if table is reviews else 1)
    print("[community security] PostgreSQL16: device claims archived without credit; BOM receipt and concurrent reconnect retries produce one award from three unchanged votes")


def verify_evidence_capacity_races(engine):
    guard_test_engine(engine)
    from concurrent.futures import ThreadPoolExecutor
    from threading import Barrier
    from sqlalchemy import func, select
    from app.community_errors import CommunityError
    from app.community_schema import media_assets, submissions
    from app.community_media import CommunityMediaStore
    import app.community_media as media
    import struct
    original_limit, original_rate = media.MAX_RETAINED_EVIDENCE_BYTES, media.MAX_SUBMISSIONS_PER_HOUR
    assert original_limit == 128 * 1024 * 1024 and original_rate == 16
    def race(actions):
        barrier = Barrier(2)
        def run(action):
            barrier.wait(timeout=10)
            try:
                action()
                return 201
            except CommunityError as error:
                return error.status_code
        with ThreadPoolExecutor(max_workers=2) as pool:
            return sorted(pool.map(run, actions, timeout=30))
    try:
        service, author, org, _, state = _security_fixture(engine, "rate")
        payload = _security_submission(state["activityDrafts"]["fisico-3"])
        alternative = payload.model_copy(update={"target_alignment": "A different explicit next clarity explanation for the same evidence."})
        media.MAX_SUBMISSIONS_PER_HOUR = 1
        assert race([lambda: service.submit(author, org, payload), lambda: service.submit(author, org, alternative)]) == [201, 429]
        with engine.begin() as connection:
            assert connection.execute(select(func.count()).select_from(submissions).where(submissions.c.author_id == author)).scalar_one() == 1
        media.MAX_SUBMISSIONS_PER_HOUR = original_rate
        service, author, org, _, state = _security_fixture(engine, "bytes")
        payload = _security_submission(state["activityDrafts"]["fisico-3"])
        def box(kind, body):
            return struct.pack(">I4s", len(body) + 8, kind) + body
        video = box(b"ftyp", b"isom\x00\x00\x00\x01") + box(b"moov", box(b"trak", box(b"mdia", box(b"hdlr", b"\x00" * 8 + b"vide")))) + box(b"mdat", b"synthetic-not-a-real-recording")
        charge = media.evidence_document_bytes(payload.evidence.model_dump(mode="json", exclude_none=True))
        media.MAX_RETAINED_EVIDENCE_BYTES = max(charge, len(video)) + 1
        assert race([lambda: service.submit(author, org, payload), lambda: CommunityMediaStore(engine).upload(author, org, video, "video/mp4")]) == [201, 413]
        with engine.begin() as connection:
            count = sum(connection.execute(select(func.count()).select_from(table).where(table.c.author_id == author)).scalar_one() for table in (submissions, media_assets))
            assert count == 1
        assert service.states.load(author, org).state == state
    finally:
        media.MAX_RETAINED_EVIDENCE_BYTES, media.MAX_SUBMISSIONS_PER_HOUR = original_limit, original_rate
    print("[community evidence] PostgreSQL16: barrier races enforce submission rate and one shared photo/video byte budget under the author lock")


if __name__ == "__main__":
    main()
