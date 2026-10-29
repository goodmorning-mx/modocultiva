"""Pure validation rules. Identity, connections and quorum are checked in storage.

Likes are never approvals. A client cannot provide reviewer IDs, a quorum count,
completion status or a destination description in a submission payload.
"""
import base64
import binascii
from hashlib import sha256
import struct
import zlib
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StrictBool, StrictInt, field_validator, model_validator

from app.clarity import clarity_transition

ModeKey = Literal["fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario"]
Language = Literal["es", "en", "zh", "hi", "ar", "it", "pt", "ru", "de", "fr", "da"]
Reaction = Literal["leaf", "soil", "water", "sun", "roots"]
REVIEW_QUORUM = 3


class StrictPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


def activity_hash(activity: str) -> str:
    return sha256(activity.strip().encode("utf-8")).hexdigest()


def completion_token(activity: str) -> str:
    """Compatibility with the existing code-point-based client ledger, not auth.

    Security binds the full activity snapshot/SHA256/revision on the server.
    """
    a, b = 2166136261, 5381
    for char in activity.strip():
        a = ((a ^ ord(char)) * 16777619) & 0xFFFFFFFF
        b = ((b * 33) ^ ord(char)) & 0xFFFFFFFF
    return f"{a:08x}{b:08x}"


def validate_evidence_png(value: str) -> str:
    prefix = "data:image/png;base64,"
    if not value.startswith(prefix) or len(value) > 400_000:
        raise ValueError("Evidence images must be normalized PNG, at most400KB encoded.")
    try:
        raw = base64.b64decode(value[len(prefix):], validate=True)
    except (ValueError, binascii.Error) as exc:
        raise ValueError("Invalid image encoding.") from exc
    if len(raw) < 45 or raw[:8] != b"\x89PNG\r\n\x1a\n" or raw[12:16] != b"IHDR" or struct.unpack(">I", raw[8:12])[0] != 13:
        raise ValueError("Invalid PNG header.")
    width, height = struct.unpack(">II", raw[16:24])
    if not 0 < width <= 1600 or not 0 < height <= 1600 or width * height > 2_560_000:
        raise ValueError("Normalize the image to at most1600px per side.")
    # Reject animated containers and truncated/chunk-overrun data. Never fetch
    # URLs or execute SVG/HTML. The browser normalizes uploads onto a still canvas.
    if raw[24] != 8 or raw[25] not in {2, 6} or any(raw[26:29]):
        raise ValueError("Use a non-interlaced RGB/RGBA canvas-normalized PNG.")
    position, ended, compressed = 8, False, bytearray()
    while position + 12 <= len(raw):
        length = struct.unpack(">I", raw[position:position + 4])[0]
        kind = raw[position + 4:position + 8]
        end = position + length + 12
        if end > len(raw) or kind == b"acTL":
            raise ValueError("Invalid or animated PNG evidence.")
        if (binascii.crc32(raw[position + 4:end - 4]) & 0xFFFFFFFF) != struct.unpack(">I", raw[end - 4:end])[0]:
            raise ValueError("PNG checksum mismatch.")
        if kind == b"IDAT":
            compressed.extend(raw[position + 8:end - 4])
        if kind == b"IEND":
            ended = length == 0 and end == len(raw)
            break
        position = end
    if not compressed or not ended:
        raise ValueError("Incomplete PNG evidence.")
    expected_size = height * (width * (3 if raw[25] == 2 else 4) + 1)
    try:
        decoder = zlib.decompressobj()
        pixels = decoder.decompress(bytes(compressed), expected_size + 1)
    except zlib.error as exc:
        raise ValueError("Invalid PNG pixels.") from exc
    if len(pixels) != expected_size or not decoder.eof or decoder.unused_data:
        raise ValueError("Invalid PNG pixel size.")
    row_size = expected_size // height
    if any(pixels[row * row_size] > 4 for row in range(height)):
        raise ValueError("Invalid PNG row filter.")
    return value


class EvidenceInput(StrictPayload):
    reflection: str = Field(min_length=20, max_length=6000)
    link: HttpUrl | None = None
    image: str | None = Field(default=None, max_length=400_000)

    @field_validator("link")
    @classmethod
    def https_only(cls, value):
        if value and (value.scheme != "https" or value.username or value.password):
            raise ValueError("Use an HTTPS evidence link without embedded credentials.")
        return value

    @field_validator("image")
    @classmethod
    def still_normalized_image(cls, value):
        return validate_evidence_png(value) if value else None


class SubmissionInput(StrictPayload):
    mode: ModeKey
    level: StrictInt = Field(ge=0, le=8)
    language: Language = "es"
    expected_activity_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    evidence: EvidenceInput
    target_alignment: str = Field(min_length=20, max_length=3000)

    def rubric(self) -> dict:
        return clarity_transition(self.level, self.language)


class ReviewInput(StrictPayload):
    expected_activity_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    decision: Literal["approve", "changes_requested"]
    activity_match: StrictBool
    effort_match: StrictBool
    clarity_match: StrictBool
    feedback: str = Field(default="", max_length=2000)

    @model_validator(mode="after")
    def deliberate_review(self):
        if self.decision == "approve" and not (self.activity_match and self.effort_match and self.clarity_match):
            raise ValueError("Approval requires evidence/activity, effort and next-clarity alignment.")
        if self.decision == "changes_requested" and len(self.feedback.strip()) < 20:
            raise ValueError("Explain what needs to change in at least20 characters.")
        return self
