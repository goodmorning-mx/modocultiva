from types import SimpleNamespace

from fastapi.testclient import TestClient
import pytest

from app import main
from app.clarity import clarity_transition


@pytest.mark.parametrize("path", ["/ai/mode/public", "/ai/mode"])
@pytest.mark.parametrize("language", ["es", "en", "zh", "hi", "ar", "it", "pt", "ru", "de", "fr", "da"])
@pytest.mark.parametrize("level", [0, 3, 6, 8])
def test_ai_uses_official_next_level_not_client_target(path, language, level, monkeypatch):
    prompts = []

    async def fake_respond(identity, conversation_id, prompt, model):
        prompts.append(prompt)
        return "A test proposal; no provider request was made.", "synthetic-conversation"

    monkeypatch.setattr(main, "_respond", fake_respond)
    main.app.dependency_overrides[main.identity_required] = lambda: SimpleNamespace(name="Synthetic member")
    try:
        with TestClient(main.app) as client:
            response = client.post(path, json={
                "language": language, "mode_name": "Synthetic mode", "level": level,
                "level_name": "Client-supplied current label", "level_description": "Current assessment",
                "effort": "Current effort", "context": "Synthetic test context",
                "target_level_description": "FAKE TARGET: completing any task is enough",
            })
        assert response.status_code == 200
        assert len(prompts) == 1
        target = clarity_transition(level, language)["target"]
        assert target["description"] in prompts[0]
        assert target["name"] in prompts[0]
        assert "FAKE TARGET" not in prompts[0]
        assert f"idioma {language}" in prompts[0]
    finally:
        main.app.dependency_overrides.pop(main.identity_required, None)


def test_ai_rejects_vision_level_and_unknown_language_without_calling_provider(monkeypatch):
    async def fail_if_called(*args, **kwargs):
        raise AssertionError("Invalid request must not call a provider")

    monkeypatch.setattr(main, "_respond", fail_if_called)
    payload = {"mode_name": "Synthetic mode", "level": 9, "level_name": "Vision", "level_description": "Vision", "effort": "Image", "context": "No activity at 9"}
    with TestClient(main.app) as client:
        assert client.post("/ai/mode/public", json=payload).status_code == 422
        assert client.post("/ai/mode/public", json={**payload, "level": 3, "language": "unknown"}).status_code == 422
