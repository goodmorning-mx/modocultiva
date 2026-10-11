from app.config import Settings, get_runtime_openai_api_key


def test_runtime_key_accepts_managed_aliases_without_persisting_them() -> None:
    settings = Settings(_env_file=None, OPENAI_API_KEY=None)
    key = get_runtime_openai_api_key(
        settings,
        {"GM_AGENT_OPENAI_API_KEY": "  runtime-test-key  "},
    )

    assert key == "runtime-test-key"


def test_runtime_key_is_missing_when_no_runtime_binding_exists() -> None:
    settings = Settings(_env_file=None, OPENAI_API_KEY=None)

    assert get_runtime_openai_api_key(settings, {}) is None
