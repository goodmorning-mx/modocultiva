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
            assert "ON CONFLICT (user_id, organization_id)" in query
            assert "DO UPDATE SET state = EXCLUDED.state" in query
            self.rows[key] = json.loads(parameters["state"])
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
