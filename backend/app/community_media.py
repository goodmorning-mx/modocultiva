"""Bounded private development video evidence; no public URLs or remote fetches.

Container/track checks do not prove that the activity occurred. The actual visual
content, effort and next-clarity congruence are judged by three real members.
"""
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import json
import struct
from uuid import uuid4

from sqlalchemy import Text, cast, func, insert, select

from app.community_errors import CommunityError
from app.community_schema import connections, media_assets, metadata, profiles, submissions
from app.community_state import CommunityStateStore

MAX_VIDEO_BYTES = 20 * 1024 * 1024
MAX_ACCOUNT_VIDEO_BYTES = 256 * 1024 * 1024
MAX_UPLOADS_PER_HOUR = 8
MAX_RETAINED_EVIDENCE_BYTES = 128 * 1024 * 1024
MAX_SUBMISSIONS_PER_HOUR = 16


def evidence_document_bytes(evidence: dict) -> int:
    """Conservative serialized-JSON charge, including photo/context/metadata."""
    return len(json.dumps(evidence, ensure_ascii=True).encode("utf-8"))


def retained_evidence_bytes(connection, user_id, organization_id) -> int:
    """ALL immutable revisions plus uploaded assets, including draft uploads.

    Aggregate in SQL rather than loading every private image into application
    memory. JSONB text is charged in UTF-8 bytes; SQLite tests store ASCII JSON.
    Video bytes count once per immutable asset, not once per reference.
    Caller must hold the author's state lock across this check and the insert.
    """
    document = cast(submissions.c.evidence, Text)
    length = func.octet_length(document) if connection.dialect.name == "postgresql" else func.length(document)
    documents = connection.execute(select(func.coalesce(func.sum(length), 0)).where(submissions.c.author_id == user_id, submissions.c.organization_id == organization_id)).scalar_one()
    videos = connection.execute(select(func.coalesce(func.sum(media_assets.c.byte_size), 0)).where(media_assets.c.author_id == user_id, media_assets.c.organization_id == organization_id)).scalar_one()
    return int(documents + videos)


def reserve_evidence_capacity(connection, user_id, organization_id, additional_bytes):
    if retained_evidence_bytes(connection, user_id, organization_id) + additional_bytes > MAX_RETAINED_EVIDENCE_BYTES:
        raise CommunityError("evidence_storage_quota", "Retained uploaded evidence exceeds this account's 128MiB limit. Existing evidence is preserved; use smaller new proof.", 413)


def check_submission_capacity(connection, user_id, organization_id, evidence):
    # No status filter: withdrawing/superseding/approval cannot replenish limits.
    recent = connection.execute(select(func.count()).select_from(submissions).where(
        submissions.c.author_id == user_id, submissions.c.organization_id == organization_id,
        submissions.c.created_at >= datetime.now(timezone.utc) - timedelta(hours=1))).scalar_one()
    if recent >= MAX_SUBMISSIONS_PER_HOUR:
        raise CommunityError("evidence_submission_rate", "At most 16 evidence submissions per hour are allowed. Retry later; existing evidence is preserved.", 429)
    reserve_evidence_capacity(connection, user_id, organization_id, evidence_document_bytes(evidence))


def _mp4_boxes(data: bytes, start: int, end: int):
    count = 0
    while start < end:
        if start + 8 > end or count > 10_000:
            raise ValueError("Invalid MP4 box.")
        size, kind = struct.unpack(">I4s", data[start:start + 8])
        header = 8
        if size == 1:
            if start + 16 > end:
                raise ValueError("Truncated MP4 box.")
            size = struct.unpack(">Q", data[start + 8:start + 16])[0]
            header = 16
        elif size == 0:
            size = end - start
        if size < header or start + size > end:
            raise ValueError("Invalid MP4 size.")
        yield kind, start + header, start + size
        start += size
        count += 1


def _has_mp4_video(data: bytes) -> bool:
    boxes = list(_mp4_boxes(data, 0, len(data)))
    if not any(kind == b"ftyp" and end - start >= 8 for kind, start, end in boxes) or not any(kind == b"mdat" and end > start for kind, start, end in boxes):
        return False
    for kind, start, end in boxes:
        if kind != b"moov":
            continue
        for track, a, b in _mp4_boxes(data, start, end):
            if track != b"trak":
                continue
            for media, c, d in _mp4_boxes(data, a, b):
                if media != b"mdia":
                    continue
                for handler, e, f in _mp4_boxes(data, c, d):
                    if handler == b"hdlr" and f - e >= 12 and data[e + 8:e + 12] == b"vide":
                        return True
    return False


def _vint(data: bytes, offset: int, *, identifier=False):
    if offset >= len(data) or data[offset] == 0:
        raise ValueError("Invalid WebM integer.")
    first = data[offset]
    length, mask = 1, 0x80
    while not first & mask:
        length += 1
        mask >>= 1
    if length > (4 if identifier else 8) or offset + length > len(data):
        raise ValueError("Invalid WebM length.")
    value = int.from_bytes(data[offset:offset + length], "big")
    if identifier:
        return value, length, False
    value &= (1 << (7 * length)) - 1
    return value, length, value == (1 << (7 * length)) - 1


def _webm_elements(data: bytes, start: int, end: int):
    count = 0
    while start < end:
        if count > 20_000:
            raise ValueError("Too many WebM elements.")
        kind, id_length, _ = _vint(data, start, identifier=True)
        size, size_length, unknown = _vint(data, start + id_length)
        payload = start + id_length + size_length
        finish = end if unknown else payload + size
        if finish > end or finish < payload:
            raise ValueError("Invalid WebM size.")
        yield kind, payload, finish
        start = finish
        count += 1


def _has_webm_video(data: bytes) -> bool:
    # A MediaRecorder MIME/EBML header is not proof that frames were captured.
    # Headless Chrome can emit a header plus padding when canvas capture fails;
    # require the actual Segment/Tracks/video TrackEntry below, never sniff-only.
    boxes = list(_webm_elements(data, 0, len(data)))
    headers = [(a, b) for kind, a, b in boxes if kind == 0x1A45DFA3]
    if not headers or not any(kind == 0x4282 and data[a:b] == b"webm" for start, end in headers for kind, a, b in _webm_elements(data, start, end)):
        return False
    for kind, a, b in boxes:
        if kind != 0x18538067:
            continue
        for child, c, d in _webm_elements(data, a, b):
            if child != 0x1654AE6B:
                continue
            for entry, e, f in _webm_elements(data, c, d):
                if entry != 0xAE:
                    continue
                if any(field == 0x83 and 0 < j - i <= 8 and int.from_bytes(data[i:j], "big") == 1 for field, i, j in _webm_elements(data, e, f)):
                    return True
    return False


def validate_video(content: bytes, mime_type: str) -> str:
    mime_type = mime_type.split(";", 1)[0].strip().lower()
    if mime_type not in {"video/mp4", "video/webm"}:
        raise CommunityError("video_format", "Use an MP4 or WebM video.", 415)
    if not content or len(content) > MAX_VIDEO_BYTES:
        raise CommunityError("video_size", "A video must be nonempty and at most20MiB.", 413)
    try:
        valid = _has_mp4_video(content) if mime_type == "video/mp4" else _has_webm_video(content)
    except (ValueError, struct.error, OverflowError):
        valid = False
    if not valid:
        raise CommunityError("video_invalid", "This is not a valid supported container with a visual video track.", 422)
    return mime_type


class CommunityMediaStore:
    def __init__(self, engine):
        self.engine = engine
        self.state_store = CommunityStateStore(engine)

    @staticmethod
    def active_member(connection, user_id, organization_id) -> bool:
        users, members = metadata.tables["gm_auth_users"], metadata.tables["gm_auth_memberships"]
        return connection.execute(select(users.c.id).join(members, members.c.user_id == users.c.id).where(users.c.id == user_id, members.c.organization_id == organization_id, users.c.is_active.is_(True))).first() is not None

    def upload(self, user_id: str, organization_id: str, content: bytes, mime_type: str) -> dict:
        mime_type = validate_video(content, mime_type)
        with self.engine.begin() as connection:
            if not self.active_member(connection, user_id, organization_id):
                raise CommunityError("member_inactive", "An active authenticated member is required.", 403)
            self.state_store.locked(connection, user_id, organization_id)
            scope = (media_assets.c.author_id == user_id) & (media_assets.c.organization_id == organization_id)
            used = connection.execute(select(func.coalesce(func.sum(media_assets.c.byte_size), 0)).where(scope)).scalar_one()
            if used + len(content) > MAX_ACCOUNT_VIDEO_BYTES:
                raise CommunityError("video_storage_quota", "Private development video storage is full for this account; use a photo or a smaller video.", 413)
            reserve_evidence_capacity(connection, user_id, organization_id, len(content))
            recent = connection.execute(select(func.count()).select_from(media_assets).where(scope, media_assets.c.created_at >= datetime.now(timezone.utc) - timedelta(hours=1))).scalar_one()
            if recent >= MAX_UPLOADS_PER_HOUR:
                raise CommunityError("video_upload_rate", "Too many recent video uploads. Try again later.", 429)
            identifier = str(uuid4())
            digest = sha256(content).hexdigest()
            connection.execute(insert(media_assets).values(id=identifier, organization_id=organization_id, author_id=user_id, mime_type=mime_type, byte_size=len(content), sha256=digest, content=content))
            return {"id": identifier, "mime_type": mime_type, "byte_size": len(content), "sha256": digest}

    def _permitted(self, connection, actor_id, organization_id, row) -> bool:
        if not self.active_member(connection, actor_id, organization_id):
            return False
        if row["author_id"] == actor_id:
            return True
        author = row["author_id"]
        if not self.active_member(connection, author, organization_id):
            return False
        low, high = sorted([actor_id, author])
        connected = connection.execute(select(connections.c.id).where(connections.c.organization_id == organization_id, connections.c.user_low == low, connections.c.user_high == high, connections.c.status == "accepted")).first()
        visible_profiles = connection.execute(select(profiles.c.user_id).where(profiles.c.organization_id == organization_id, profiles.c.user_id.in_([actor_id, author]), profiles.c.discoverable.is_(True))).all()
        if not connected or len(visible_profiles) != 2:
            return False
        # Unsubmitted draft uploads remain owner-only. Withdrawing/superseding a
        # revision revokes its visibility; an active visible revision is needed.
        return connection.execute(select(submissions.c.id).where(submissions.c.organization_id == organization_id, submissions.c.author_id == author, submissions.c.status.in_(["pending", "changes_requested", "approved"]), submissions.c.evidence["video_asset_id"].as_string() == row["id"])).first() is not None

    def read(self, actor_id: str, organization_id: str, asset_id: str) -> dict:
        with self.engine.begin() as connection:
            row = connection.execute(select(media_assets).where(media_assets.c.id == asset_id, media_assets.c.organization_id == organization_id)).mappings().first()
            if row is None or not self._permitted(connection, actor_id, organization_id, row):
                raise CommunityError("media_not_found", "Visual evidence is not available to this member.", 404)
            return dict(row)
