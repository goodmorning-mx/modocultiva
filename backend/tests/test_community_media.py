from datetime import datetime, timezone
from hashlib import sha256
import base64
import importlib.util
from pathlib import Path
import struct
from types import SimpleNamespace
import zlib

import pytest
from sqlalchemy import insert, select, update

from app.community_errors import CommunityError
from app.community_media import CommunityMediaStore, MAX_VIDEO_BYTES, validate_video
from app.community_schema import connections, media_assets, metadata, profiles, submissions
from test_community_state import AUTHOR, ORG, database, existing_state, raw_state, seed_submission

REVIEWER = "synthetic-reviewer-1"


# Actual Chrome155.0.8059.85 MediaRecorder output, not a fabricated EBML tree.
# Six solid-colour canvas frames, 640x360, captureStream(6), VP8, 170ms/frame.
# Launched headless with --disable-gpu --disable-accelerated-video-encode.
# Browser playback verified 640x360, six decoded frames, duration0.900924s.
# Compressed only to keep the unmodified 2213-byte fixture small in source.
CHROME_WEBM = zlib.decompress(base64.b64decode(
    "eJyTcr2/eL5TWyOj0/dGRqdPjSxOnxs5nJpaylOTcp3aG1mcWhuZJIIb0hkZQICjVNB3dslO393dwatbRD1XpgWvacyD8MRC1mUHr2mcDOHJO28rDV7TeM13d0/w6haZ4N3ZwWuaOJLfrGMgCYCsWKB1fWMzv5ODS2eLS6K1sm9Dm3NGUX5uargjlAGyed+6PdcbGYuPttftUuNy32XZ3MgY+q6Rsa01LD4swOLB/A1NTA27mhgzgg80MoZumBC6sZExdGcjU+iuRt7Q3Y2MIOdCfMje+LyRYYFz3kLHbY0MDAwTjBnmMmo1MGUwsrhztLZ2zGzpEG9iKvlkZbVl3/XtZn4F30bRQKMTDP8+BHN1afxfp5fT9qF0oePGZY7r3jUyLnVcEQCPPq52aPRZMDGwibF8Z2tMmZ99e7a6RfUoGkhk3vDv9TqGBQ7rF35vZFjFUMjDIChwgEGC58KJj7unVNw9ZWXB6MCotTQkwWtlqNbSkFVTg1aFUspc9u8dl9v6n2kF62NyHRhKF25YBk4uKzeyMGgJtjBIMEhE6H9h4GhgYWBouxDZ131nyfXnWsdc05z8N4skLti0gOF3I8MCh1ULPzUyJjNs5GYQFOgBacr/wsPA1EQdJ8KYKxj+fc7sO3lv+t+qS3dud6A7NoAox65a4LBm4edGJjmIYzNo6dglvyd/2fu/99/ampl86K4VIca1TYzJCxzWLvzSyHQT4lwPGjr353PmsMkee/4f+x+2z6cdzb0CL4hyL5PcAkefhd8amVsg7jWhpXvT5XvUJpXU/4mSv33+h+mWBaULHc4sczgJcrPD4UA2Bi2BHQxy75h5H9j/3xfM+P+fXO+j3p29dxoEDjAIMPAYvONYvOGYfIcpg/cJp/MuUnWKtx3O5te+3/f93u/7te/3ft/3+371+9rvIP57EP8eiL/3+77vIGE6KGv43cR0E9Ra6N3dvbmRYXvb90bGj43XAHbx1BU="
))
# Exact110-byte output from the same recorder under the default headless GPU
# setup on this machine: EBML header then74 zero bytes, no Segment or Tracks.
CHROME_FAILED_CAPTURE = zlib.decompress(base64.b64decode(
    "eJyTcr2/eL5TWyOj0/dGRqdPjSxOnxs5nJpaylOTcp3aG1mcWhuZGKgGAE7jDog="
))


def mp4(handler=b"vide"):
    def box(kind, body):
        return struct.pack(">I4s", len(body) + 8, kind) + body
    return box(b"ftyp", b"isom\x00\x00\x00\x01") + box(b"moov", box(b"trak", box(b"mdia", box(b"hdlr", b"\x00" * 8 + handler)))) + box(b"mdat", b"synthetic-container-fixture-not-playable")


def webm(track=1):
    def element(kind, body):
        assert len(body) < 127
        return bytes.fromhex(kind) + bytes([0x80 | len(body)]) + body
    return element("1a45dfa3", element("4282", b"webm")) + element("18538067", element("1654ae6b", element("ae", element("83", bytes([track])))))


@pytest.mark.parametrize("content,mime", [(mp4(), "video/mp4"), (webm(), "video/webm"), (mp4(), " Video/MP4; codecs=avc1 ")], ids=["mp4", "webm", "mime-normalization"])
def test_supported_container_has_a_visual_track(content, mime):
    assert validate_video(content, mime) in {"video/mp4", "video/webm"}


@pytest.mark.parametrize("mime", ["video/webm", "video/webm;codecs=vp8"])
def test_actual_chrome_canvas_webm_with_a_video_track_is_accepted(mime):
    assert len(CHROME_WEBM) == 2213
    assert sha256(CHROME_WEBM).hexdigest() == "52ef7a781a17ab2edf314e4c58b00198888e9595d77dcd06e79d3c1291b3d5c7"
    assert validate_video(CHROME_WEBM, mime) == "video/webm"


def test_actual_chrome_webm_upload_preserves_bytes_and_draft_owner_boundary(database):
    before = raw_state(database)
    store = CommunityMediaStore(database)
    asset = store.upload(AUTHOR, ORG, CHROME_WEBM, "video/webm;codecs=vp8")
    assert asset["mime_type"] == "video/webm" and asset["byte_size"] == 2213
    assert asset["sha256"] == sha256(CHROME_WEBM).hexdigest()
    assert store.read(AUTHOR, ORG, asset["id"])["content"] == CHROME_WEBM
    with pytest.raises(CommunityError) as error:
        store.read(REVIEWER, ORG, asset["id"])
    assert error.value.status_code == 404 and raw_state(database) == before


@pytest.mark.parametrize("content", [CHROME_FAILED_CAPTURE, CHROME_WEBM[:36], CHROME_WEBM[:-1], CHROME_WEBM.replace(b"\x83\x81\x01", b"\x83\x81\x02", 1)], ids=["actual-gpu-failed-capture", "header-only", "truncated-browser-file", "audio-track-not-video"])
def test_actual_chrome_origin_does_not_bypass_container_or_track_checks(content):
    with pytest.raises(CommunityError) as error:
        validate_video(content, "video/webm;codecs=vp8")
    assert error.value.code == "video_invalid" and error.value.status_code == 422


@pytest.mark.parametrize("content,mime,status", [
    (b"", "video/mp4", 413), (b"x" * (MAX_VIDEO_BYTES + 1), "video/mp4", 413),
    (b"<svg/>", "image/svg+xml", 415), (mp4(b"soun"), "video/mp4", 422),
    (webm(2), "video/webm", 422), (mp4()[:-1], "video/mp4", 422),
    (b"\x00" * 8, "video/webm", 422), (webm(), "video/mp4", 422),
    (b"\x00\x00\x00\x01ftyp\x00", "video/mp4", 422),
], ids=["empty", "oversize", "active-content", "audio-mp4", "audio-webm", "truncated", "invalid-vint", "wrong-container", "truncated-extended-box"])
def test_unsupported_audio_only_or_malformed_container_is_rejected(content, mime, status):
    with pytest.raises(CommunityError) as error:
        validate_video(content, mime)
    assert error.value.status_code == status


def publish_for_review(database, asset_id):
    with database.begin() as connection:
        for member in (AUTHOR, REVIEWER):
            connection.execute(insert(profiles).values(user_id=member, organization_id=ORG, display_name="Synthetic", bio="", discoverable=True))
        low, high = sorted([AUTHOR, REVIEWER])
        connection.execute(insert(connections).values(id="synthetic-connection", organization_id=ORG, user_low=low, user_high=high, requested_by=AUTHOR, status="accepted", updated_at=datetime.now(timezone.utc)))
        seed_submission(connection)
        connection.execute(update(submissions).values(evidence={"video_asset_id": asset_id}).where(submissions.c.id == "synthetic-submission"))


def test_private_upload_preserves_existing_map_and_is_owner_only_until_submitted(database):
    before = raw_state(database)
    store = CommunityMediaStore(database)
    asset = store.upload(AUTHOR, ORG, mp4(), "video/mp4")
    assert set(asset) == {"id", "mime_type", "byte_size", "sha256"}
    assert asset["sha256"] == sha256(mp4()).hexdigest()
    assert store.read(AUTHOR, ORG, asset["id"])["content"] == mp4()
    with pytest.raises(CommunityError) as error:
        store.read(REVIEWER, ORG, asset["id"])
    assert error.value.status_code == 404
    assert raw_state(database) == before
    publish_for_review(database, asset["id"])
    assert store.read(REVIEWER, ORG, asset["id"])["content"] == mp4()
    assert raw_state(database)["state"] == existing_state()


@pytest.mark.parametrize("revocation", ["disconnected", "author-private", "reviewer-private", "author-inactive", "reviewer-inactive", "withdrawn", "superseded", "stale", "not-referenced"])
def test_private_media_access_is_revoked_by_relationship_profile_revision_or_membership(database, revocation):
    store = CommunityMediaStore(database)
    asset = store.upload(AUTHOR, ORG, webm(), "video/webm")
    publish_for_review(database, asset["id"])
    with database.begin() as connection:
        if revocation == "disconnected":
            connection.execute(update(connections).values(status="disconnected"))
        elif revocation.endswith("-private"):
            member = AUTHOR if revocation.startswith("author") else REVIEWER
            connection.execute(update(profiles).where(profiles.c.user_id == member).values(discoverable=False))
        elif revocation.endswith("-inactive"):
            member = AUTHOR if revocation.startswith("author") else REVIEWER
            connection.execute(update(metadata.tables["gm_auth_users"]).where(metadata.tables["gm_auth_users"].c.id == member).values(is_active=False))
        elif revocation == "not-referenced":
            connection.execute(update(submissions).values(evidence={"video_asset_id": "unrelated"}))
        else:
            connection.execute(update(submissions).values(status=revocation))
    with pytest.raises(CommunityError) as error:
        store.read(REVIEWER, ORG, asset["id"])
    assert error.value.status_code == 404


def test_cross_organization_and_inactive_upload_are_denied_without_exposing_asset(database):
    store = CommunityMediaStore(database)
    asset = store.upload(AUTHOR, ORG, mp4(), "video/mp4")
    with pytest.raises(CommunityError) as error:
        store.read(AUTHOR, "synthetic-other-org", asset["id"])
    assert error.value.status_code == 404
    with pytest.raises(CommunityError) as error:
        store.upload(AUTHOR, "synthetic-other-org", mp4(), "video/mp4")
    assert error.value.status_code == 403


def test_upload_rate_and_storage_quota_are_enforced(database, monkeypatch):
    import app.community_media as module
    store = CommunityMediaStore(database)
    monkeypatch.setattr(module, "MAX_UPLOADS_PER_HOUR", 1)
    store.upload(AUTHOR, ORG, mp4(), "video/mp4")
    with pytest.raises(CommunityError, match="recent video uploads") as error:
        store.upload(AUTHOR, ORG, mp4(), "video/mp4")
    assert error.value.status_code == 429
    monkeypatch.setattr(module, "MAX_ACCOUNT_VIDEO_BYTES", len(mp4()))
    with pytest.raises(CommunityError, match="storage is full") as error:
        store.upload(AUTHOR, ORG, mp4(), "video/mp4")
    assert error.value.status_code == 413
    with database.begin() as connection:
        assert len(connection.execute(select(media_assets)).all()) == 1


def test_128_mib_shared_budget_includes_all_photos_and_unsubmitted_videos(database, monkeypatch):
    import app.community_media as module
    from app.community_service import CommunityService
    from app.community_rules import SubmissionInput, activity_hash
    from test_community_foundation import png
    assert module.MAX_RETAINED_EVIDENCE_BYTES == 128 * 1024 * 1024
    assert module.MAX_SUBMISSIONS_PER_HOUR == 16
    assert 120 * 410_000 < module.MAX_RETAINED_EVIDENCE_BYTES
    service = CommunityService(database)
    service.set_profile(AUTHOR, ORG, "Synthetic", "", True)
    activity = existing_state()["activityDrafts"]["fisico-3"]
    payload = SubmissionInput(mode="fisico", level=3, expected_activity_hash=activity_hash(activity), evidence={"reflection": "Actual synthetic uploaded evidence context.", "image": png()}, target_alignment="An explicit explanation of the next clarity destination.")
    charge = module.evidence_document_bytes(payload.evidence.model_dump(mode="json", exclude_none=True))
    monkeypatch.setattr(module, "MAX_RETAINED_EVIDENCE_BYTES", charge + len(mp4()) - 1)
    service.submit(AUTHOR, ORG, payload)
    with pytest.raises(CommunityError) as error:
        CommunityMediaStore(database).upload(AUTHOR, ORG, mp4(), "video/mp4")
    assert error.value.code == "evidence_storage_quota"
    # Another author has an independent budget, and owner-only unused uploads
    # consume it even before any evidence is submitted.
    video = CommunityMediaStore(database).upload(REVIEWER, ORG, mp4(), "video/mp4")
    with database.begin() as connection:
        assert module.retained_evidence_bytes(connection, REVIEWER, ORG) == video["byte_size"]
        assert module.retained_evidence_bytes(connection, AUTHOR, ORG) == charge


def test_private_media_http_contract_requires_identity_and_never_returns_public_url(monkeypatch):
    from fastapi.testclient import TestClient
    from app import main
    asset_id = "00000000-0000-4000-8000-000000000001"
    calls = []
    def upload(user, org, content, mime):
        calls.append((user, org, content, mime))
        normalized_mime = validate_video(content, mime)
        return {"id": asset_id, "mime_type": normalized_mime, "byte_size": len(content), "sha256": sha256(content).hexdigest()}
    monkeypatch.setattr(main, "community_media_store", SimpleNamespace(upload=upload, read=lambda user, org, identifier: {"content": mp4(), "mime_type": "video/mp4"}))
    try:
        with TestClient(main.app) as client:
            assert client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4"}).status_code == 401
            assert client.get(f"/community/media/{asset_id}").status_code == 401
            main.app.dependency_overrides[main.identity_required] = lambda: SimpleNamespace(user_id=AUTHOR, organization_id=ORG)
            result = client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4"})
            assert result.status_code == 201 and "url" not in result.json()
            assert calls == [(AUTHOR, ORG, mp4(), "video/mp4")]
            response = client.get(f"/community/media/{asset_id}")
            assert response.content == mp4()
            assert response.headers["cache-control"] == "private, no-store, max-age=0"
            assert response.headers["x-content-type-options"] == "nosniff"
            assert "sandbox" in response.headers["content-security-policy"]
            assert client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4", "Content-Encoding": "gzip"}).status_code == 415
            assert client.post("/community/media/video", content=mp4(), headers={"Content-Type": "video/mp4", "Content-Length": str(MAX_VIDEO_BYTES + 1)}).status_code == 413
            assert client.post("/community/media/video", content=b"not a video", headers={"Content-Type": "video/mp4"}).status_code == 422
            result = client.post("/community/media/video", content=CHROME_WEBM, headers={"Content-Type": "video/webm;codecs=vp8"})
            assert result.status_code == 201 and result.json()["byte_size"] == 2213 and result.json()["mime_type"] == "video/webm"
            assert calls[-1] == (AUTHOR, ORG, CHROME_WEBM, "video/webm;codecs=vp8")
            assert client.post("/community/media/video", content=CHROME_FAILED_CAPTURE, headers={"Content-Type": "video/webm;codecs=vp8"}).status_code == 422
    finally:
        main.app.dependency_overrides.pop(main.identity_required, None)


def test_private_media_migration_is_frozen_additive_and_development_only(monkeypatch):
    from sqlalchemy.schema import CreateIndex, CreateTable
    from sqlalchemy.dialects import postgresql
    path = Path(__file__).parents[1] / "alembic" / "versions" / "202610290002_private_visual_evidence.py"
    spec = importlib.util.spec_from_file_location("synthetic_private_media_migration", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    dialect = postgresql.dialect()
    expected = [str(CreateTable(media_assets).compile(dialect=dialect)).strip()] + [str(CreateIndex(index).compile(dialect=dialect)).strip() for index in media_assets.indexes]
    # SQLAlchemy emits trailing line spaces; the frozen source intentionally
    # omits them. Compare all SQL tokens/order without requiring whitespace lint
    # violations or changing the migration's actual schema semantics.
    canonical_lines = lambda statement: "\n".join(line.rstrip() for line in statement.strip().splitlines())
    assert tuple(map(canonical_lines, expected)) == tuple(map(canonical_lines, module.SCHEMA_V2))
    assert module.down_revision == "202610290001"
    monkeypatch.setattr("app.config.get_settings", lambda: SimpleNamespace(app_env="production"))
    with pytest.raises(RuntimeError, match="only for development"):
        module.upgrade()
    with pytest.raises(RuntimeError, match="must not be dropped"):
        module.downgrade()
