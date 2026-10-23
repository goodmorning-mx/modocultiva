import json
from contextlib import contextmanager

from app.billing import UserStateStore


class _StateResult:
    def __init__(self, state):
        self.state = state

    def mappings(self):
        return self

    def first(self):
        return {"state": self.state} if self.state is not None else None


class _InMemoryStateDatabase:
    """Minimal database double for exercising UserStateStore serialization."""

    def __init__(self):
        self.rows = {}

    @contextmanager
    def begin(self):
        yield self

    def execute(self, statement, parameters):
        query = str(statement)
        key = (parameters["user_id"], parameters["organization_id"])

        if query.lstrip().startswith("SELECT"):
            return _StateResult(self.rows.get(key))

        if query.lstrip().startswith("INSERT"):
            incoming = json.loads(parameters["state"])
            assert "ON CONFLICT (user_id, organization_id)" in query
            if "jsonb_set(" in query:
                for field in ("levels", "presets", "activityDrafts", "insightRequests", "visionImages", "featuredBadges"):
                    assert f"'{{{field}}}'" in query
                existing = self.rows.get(key, {})
                merged = {**incoming, **existing}
                for field in ("levels", "presets", "activityDrafts", "insightRequests", "visionImages"):
                    merged[field] = {**incoming.get(field, {}), **existing.get(field, {})}
                if "featuredBadges" in incoming or "featuredBadges" in existing:
                    merged["featuredBadges"] = list(dict.fromkeys(
                        [*existing.get("featuredBadges", []), *incoming.get("featuredBadges", [])]
                    ))
                self.rows[key] = merged
            else:
                assert "DO UPDATE SET state = EXCLUDED.state" in query
                self.rows[key] = incoming
            return None

        raise AssertionError(f"Unexpected user state query: {query}")


def test_user_state_round_trip_preserves_all_twelve_preset_levels_on_update() -> None:
    database = _InMemoryStateDatabase()
    store = UserStateStore(database)
    preset_levels = {
        "fisico": 1,
        "intelectual": 2,
        "emocional": 3,
        "arquetipico": 4,
        "espiritual": 5,
        "romantico": 6,
        "familiar": 7,
        "social": 8,
        "financiero": 9,
        "profesional": 0,
        "ludico": 1,
        "visionario": 2,
    }
    preset_name = "Mi mapa completo"
    original_state = {
        "levels": {mode: 0 for mode in preset_levels},
        "presets": {preset_name: preset_levels},
    }

    store.save("user-1", "org-1", original_state)

    updated_state = {
        **original_state,
        "levels": {mode: 9 for mode in preset_levels},
        "profileName": "Actualizado",
    }
    store.save("user-1", "org-1", updated_state)

    saved_state = store.get("user-1", "org-1")
    assert saved_state["profileName"] == "Actualizado"
    assert saved_state["levels"] == {mode: 9 for mode in preset_levels}
    assert saved_state["presets"][preset_name] == preset_levels
    assert len(saved_state["presets"][preset_name]) == 12


def test_device_migration_merges_local_preset_and_levels_into_existing_account() -> None:
    database = _InMemoryStateDatabase()
    store = UserStateStore(database)
    local_levels = {
        "fisico": 7,
        "intelectual": 7,
        "emocional": 7,
        "arquetipico": 7,
        "espiritual": 7,
        "romantico": 7,
        "familiar": 7,
        "social": 7,
        "financiero": 7,
        "profesional": 7,
        "ludico": 7,
        "visionario": 7,
    }
    remote_levels = {mode: 2 for mode in local_levels}
    store.save("user-1", "org-1", {
        "levels": remote_levels,
        "presets": {"10 Julio": remote_levels},
        "profileName": "Cuenta existente",
        "featuredBadges": ["three-moves"],
    })

    store.merge("user-1", "org-1", {
        "levels": local_levels,
        "presets": {"10 Julio": local_levels, "Prueba Preset 1": local_levels},
        "featuredBadges": ["first-step"],
    })

    saved_state = store.get("user-1", "org-1")
    assert saved_state["profileName"] == "Cuenta existente"
    assert saved_state["levels"] == remote_levels
    assert saved_state["presets"] == {
        "10 Julio": remote_levels,
        "Prueba Preset 1": local_levels,
    }
    assert set(saved_state["featuredBadges"]) == {"first-step", "three-moves"}


def test_device_migration_keeps_existing_cloud_fields_missing_from_device_snapshot() -> None:
    database = _InMemoryStateDatabase()
    store = UserStateStore(database)
    cloud_levels = {mode: 4 for mode in ("fisico", "intelectual", "emocional", "arquetipico", "espiritual", "romantico", "familiar", "social", "financiero", "profesional", "ludico", "visionario")}
    store.save("user-1", "org-1", {
        "levels": cloud_levels,
        "presets": {"Cloud preset": cloud_levels},
        "profileName": "Cuenta existente",
        "language": "es",
    })

    store.merge("user-1", "org-1", {"presets": {"Device preset": {"fisico": 7}}})

    saved_state = store.get("user-1", "org-1")
    assert saved_state["levels"] == cloud_levels
    assert saved_state["presets"] == {
        "Cloud preset": cloud_levels,
        "Device preset": {"fisico": 7},
    }
    assert saved_state["profileName"] == "Cuenta existente"
    assert saved_state["language"] == "es"
