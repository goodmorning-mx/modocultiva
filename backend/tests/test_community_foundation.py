import base64
import binascii
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import struct
from types import SimpleNamespace
import zlib

import pytest
from pydantic import ValidationError
from sqlalchemy import create_engine, event, insert
from sqlalchemy.exc import IntegrityError

from app.community_rules import (
    EvidenceInput, REVIEW_QUORUM, ReviewInput, SubmissionInput,
    activity_hash, completion_token, validate_evidence_png,
)
from app.community_schema import (
    advance_claims, connections, metadata, reviews, submissions,
)


def png(width=1, height=1, *, corrupt=False, animated=False, extra_pixels=0):
    def chunk(kind, data):
        crc = binascii.crc32(kind + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", crc)
    header = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    pixels = (b"\x00" + b"\x80\xff\x80\xff" * width) * height + b"x" * extra_pixels
    raw = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
    if animated:
        raw += chunk(b"acTL", struct.pack(">II", 1, 0))
    raw += chunk(b"IDAT", zlib.compress(pixels)) + chunk(b"IEND", b"")
    if corrupt:
        raw = raw[:-5] + b"x" + raw[-4:]
    return "data:image/png;base64," + base64.b64encode(raw).decode()


def submission_payload(**changes):
    return {"mode": "fisico", "level": 3, "expected_activity_hash": activity_hash("A saved activity"),
            "evidence": {"reflection": "Synthetic account of doing the saved practice."},
            "target_alignment": "I can now sustain the minimum routine described by the next level.", **changes}


def test_quorum_is_three_and_completion_token_matches_client_codepoints():
    assert REVIEW_QUORUM == 3
    # Fixed compatibility fixtures include non-BMP and CJK; SHA256, not this
    # non-cryptographic display token, binds authenticated review revisions.
    assert completion_token("hello") == "4f9f2cab0a9cede7"
    assert completion_token("  hello  ") == completion_token("hello")
    assert len(completion_token("Cultivar 🌱 中文")) == 16
    assert activity_hash("A") != activity_hash("a")
    assert activity_hash(" A ") == activity_hash("A")


@pytest.mark.parametrize("level", range(9))
def test_submission_binds_the_server_owned_next_target(level):
    value = SubmissionInput(**submission_payload(level=level))
    assert value.rubric()["target"]["level"] == level + 1


@pytest.mark.parametrize("change", [
    {"level": 9}, {"level": True}, {"level": "3"}, {"level": -1}, {"mode": "invented"},
    {"target_alignment": "short"}, {"evidence": {"reflection": "short"}},
    {"expected_activity_hash": "fake"}, {"reviewer_ids": ["a", "b", "c"]},
    {"status": "approved"}, {"quorum": 3}, {"target_description": "Whatever I want"},
])
def test_client_cannot_fabricate_a_completed_transition(change):
    with pytest.raises(ValidationError):
        SubmissionInput(**submission_payload(**change))


@pytest.mark.parametrize("criterion", ["activity_match", "effort_match", "clarity_match"])
def test_each_approval_criterion_is_deliberate_and_required(criterion):
    payload = {"expected_activity_hash": activity_hash("A"), "decision": "approve", "activity_match": True, "effort_match": True, "clarity_match": True}
    assert ReviewInput(**payload).decision == "approve"
    with pytest.raises(ValidationError):
        ReviewInput(**{**payload, criterion: False})
    with pytest.raises(ValidationError):
        ReviewInput(**{**payload, criterion: "true"})
    with pytest.raises(ValidationError):
        ReviewInput(**{**payload, "reviewer_id": "someone-else"})


def test_changes_requested_needs_actionable_feedback():
    payload = {"expected_activity_hash": activity_hash("A"), "decision": "changes_requested", "activity_match": False, "effort_match": False, "clarity_match": False}
    with pytest.raises(ValidationError):
        ReviewInput(**payload)
    assert ReviewInput(**{**payload, "feedback": "Explain how this routine demonstrates the next clarity stage."})


@pytest.mark.parametrize("link", ["http://example.test/proof", "javascript:alert(1)", "file:///proof", "https://user:password@example.test/proof"])
def test_evidence_links_are_explicit_https_without_credentials(link):
    with pytest.raises(ValidationError):
        EvidenceInput(reflection="Synthetic evidence explanation long enough.", link=link)


def test_still_normalized_png_and_explicit_links_are_accepted_without_network():
    value = EvidenceInput(reflection="Synthetic evidence explanation long enough.", image=png(), link="https://example.test/proof")
    assert value.image == png()
    assert str(value.link) == "https://example.test/proof"


@pytest.mark.parametrize("image", [
    "data:image/svg+xml;base64,PHN2Zy8+", "data:text/html;base64,AAAA", "https://example.test/image.png",
    "data:image/png;base64,not base64!", png(corrupt=True), png(animated=True), png(extra_pixels=20), png(1601, 1),
    "data:image/png;base64," + "A" * 400_000,
], ids=["svg", "html", "remote", "encoding", "crc", "animated", "pixel-overrun", "dimensions", "encoded-size"])
def test_active_malformed_animated_oversized_or_truncated_images_are_rejected(image):
    with pytest.raises(ValueError):
        validate_evidence_png(image)


@pytest.fixture
def database():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    @event.listens_for(engine, "connect")
    def enforce_foreign_keys(connection, _):
        connection.execute("PRAGMA foreign_keys=ON")
    metadata.create_all(engine)
    now = datetime.now(timezone.utc)
    with engine.begin() as connection:
        for org in ("synthetic-org-a", "synthetic-org-b"):
            connection.execute(insert(metadata.tables["gm_auth_organizations"]).values(id=org, slug=org, name=org, created_at=now))
        for user, org in [("author", "synthetic-org-a"), ("reviewer", "synthetic-org-a"), ("other", "synthetic-org-a"), ("outsider", "synthetic-org-b")]:
            connection.execute(insert(metadata.tables["gm_auth_users"]).values(id=user, email=f"{user}@example.test", name=f"Synthetic {user}", password_hash="not-a-real-password-hash", is_active=True, created_at=now))
            connection.execute(insert(metadata.tables["gm_auth_memberships"]).values(user_id=user, organization_id=org, roles=[], permissions=[], created_at=now))
        connection.execute(insert(submissions).values(**submission_record("submission-1")))
    try:
        yield engine
    finally:
        engine.dispose()


def submission_record(identifier):
    return dict(id=identifier, organization_id="synthetic-org-a", author_id="author", mode="fisico", source_level=3, target_level=4, revision_number=int(identifier[-1]), activity="A saved activity", activity_hash=activity_hash("A saved activity"), draft_token=completion_token("A saved activity"), rubric_version="synthetic-rubric", rubric_snapshot={}, evidence={}, target_alignment="Synthetic next clarity alignment", status="pending", updated_at=datetime.now(timezone.utc))


def review_record(**changes):
    return dict(submission_id="submission-1", reviewer_id="reviewer", organization_id="synthetic-org-a", author_id="author", decision="approve", activity_match=True, effort_match=True, clarity_match=True, feedback="", **changes)


def test_database_rejects_duplicate_votes(database):
    with database.begin() as connection:
        connection.execute(insert(reviews).values(**review_record()))
    with pytest.raises(IntegrityError), database.begin() as connection:
        connection.execute(insert(reviews).values(**review_record()))


@pytest.mark.parametrize("change", [
    {"reviewer_id": "author"}, {"reviewer_id": "outsider"},
    {"organization_id": "synthetic-org-b"}, {"author_id": "other"}, {"clarity_match": False},
    {"decision": "changes_requested", "feedback": "short"},
])
def test_database_enforces_independent_same_org_review_and_criteria(database, change):
    with pytest.raises(IntegrityError), database.begin() as connection:
        connection.execute(insert(reviews).values(**{**review_record(), **change}))


def test_database_cannot_advance_the_same_source_level_twice(database):
    record = dict(organization_id="synthetic-org-a", author_id="author", mode="fisico", source_level=3, submission_id="submission-1")
    with database.begin() as connection:
        connection.execute(insert(advance_claims).values(**record))
        connection.execute(insert(submissions).values(**submission_record("submission-2")))
    with pytest.raises(IntegrityError), database.begin() as connection:
        connection.execute(insert(advance_claims).values(**{**record, "submission_id": "submission-2"}))
    with pytest.raises(IntegrityError), database.begin() as connection:
        connection.execute(insert(advance_claims).values(**{**record, "mode": "familiar"}))


@pytest.mark.parametrize("change", [
    {"user_high": "author"}, {"requested_by": "outsider"}, {"user_high": "outsider"},
    {"status": "fake"},
])
def test_database_rejects_invalid_or_cross_org_connection(database, change):
    record = dict(id="synthetic-connection", organization_id="synthetic-org-a", user_low="author", user_high="reviewer", requested_by="author", status="pending", updated_at=datetime.now(timezone.utc))
    with pytest.raises(IntegrityError), database.begin() as connection:
        connection.execute(insert(connections).values(**{**record, **change}))


def test_migration_refuses_production_and_destructive_downgrade(monkeypatch):
    path = Path(__file__).parents[1] / "alembic" / "versions" / "202610290001_community_evidence.py"
    spec = importlib.util.spec_from_file_location("synthetic_community_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(app_env="production"))
    with pytest.raises(RuntimeError, match="only for development"):
        module.upgrade()
    with pytest.raises(RuntimeError, match="must not be dropped"):
        module.downgrade()


def test_frozen_postgres_migration_matches_v1_models():
    from sqlalchemy.schema import CreateIndex, CreateTable
    from sqlalchemy.dialects import postgresql
    from app.community_schema import COMMUNITY_TABLES
    path = Path(__file__).parents[1] / "alembic" / "versions" / "202610290001_community_evidence.py"
    spec = importlib.util.spec_from_file_location("synthetic_community_frozen_schema", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    dialect = postgresql.dialect()
    expected = [str(CreateTable(table).compile(dialect=dialect)).strip() for table in COMMUNITY_TABLES]
    expected += [str(CreateIndex(index).compile(dialect=dialect)).strip() for table in COMMUNITY_TABLES for index in sorted(table.indexes, key=lambda item: item.name)]
    assert tuple(expected) == module.SCHEMA_V1
    assert len(COMMUNITY_TABLES) == 13
    assert all(statement.startswith(("CREATE TABLE modocultiva_", "CREATE INDEX ix_community_")) for statement in module.SCHEMA_V1)


@pytest.mark.parametrize("value", [
    "", "postgresql+psycopg://synthetic_migration_user:synthetic@remote.example.test/modocultiva_community_migration_test",
    "postgresql+psycopg://synthetic_migration_user:synthetic@127.0.0.1/another_database",
    "postgresql+psycopg://synthetic_migration_user:synthetic@127.0.0.1/modocultiva_community_migration_test?host=remote.example.test",
])
def test_migration_check_refuses_implicit_or_nonlocal_databases(monkeypatch, value):
    from scripts.verify_community_migration import main
    monkeypatch.setenv("COMMUNITY_MIGRATION_TEST_URL", value)
    with pytest.raises(RuntimeError):
        main()


def test_storage_readiness_is_not_feature_enablement(database, monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    from app.community_status import community_storage_ready
    assert community_storage_ready(database)
    monkeypatch.setattr(main, "community_storage_ready", lambda _: True)
    with TestClient(main.app) as client:
        assert client.get("/community/capabilities").json() == {
            "storage_ready": True, "features_enabled": False, "review_quorum": 3,
            "schema_version": "202610290001",
        }
