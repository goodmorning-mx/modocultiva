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


def main():
    value = os.environ.get("COMMUNITY_MIGRATION_TEST_URL", "")
    if not value:
        raise RuntimeError("Set the dedicated local migration test URL; no default database is used.")
    url = make_url(value)
    if url.host not in {"127.0.0.1", "localhost"} or url.database != "modocultiva_community_migration_test" or url.query or url.username != "synthetic_migration_user" or url.port not in {None, 5432}:
        raise RuntimeError("Migration test refuses any database except the explicitly named local synthetic test DB.")
    engine = create_engine(value)
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
    command.upgrade(config, "head")
    with engine.begin() as connection:
        again = connection.execute(text("SELECT revision,legacy_snapshot FROM modocultiva_progress_controls")).mappings().one()
        assert dict(again) == dict(control), "Repeated startup must not reset revisions/history"
    print("[community migration] PostgreSQL16: additive tables, existing all12 levels/presets/drafts/completions/images/reactions/language/profile and timestamps preserved; historical snapshot and repeated startup passed")
    engine.dispose()


if __name__ == "__main__":
    main()
