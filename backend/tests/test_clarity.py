import json
from pathlib import Path

import pytest

from app.clarity import activity_alignment_instruction, clarity_transition

LANGUAGES = ["es", "en", "zh", "hi", "ar", "it", "pt", "ru", "de", "fr", "da"]
RUBRIC = json.loads((Path(__file__).parents[1] / "app" / "clarity_levels.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("language", LANGUAGES)
@pytest.mark.parametrize("level", range(9))
def test_target_is_the_exact_next_clarity_level_with_current_effort(level, language):
    result = clarity_transition(level, language)
    assert result["source"] == RUBRIC["languages"][language][level]
    assert result["target"] == RUBRIC["languages"][language][level + 1]
    assert result["version"] == RUBRIC["version"]
    assert result["effort"] == ("time" if level <= 2 else "time_energy" if level <= 5 else "time_energy_investment")
    instruction = activity_alignment_instruction(level, language)
    assert result["target"]["name"] in instruction
    assert result["target"]["description"] in instruction
    assert "No basta" in instruction
    assert "reconocerse" in instruction
    assert "evidencia" in instruction
    assert "No garantices" in instruction


@pytest.mark.parametrize("level", [-1, 9, 10, 1.5, True, False, None, "3"])
def test_vision_and_invalid_activity_levels_are_not_transitions(level):
    with pytest.raises(ValueError):
        clarity_transition(level)


def test_fallback_and_returned_snapshots_do_not_mutate_the_rubric():
    expected = clarity_transition(3, "es")
    assert clarity_transition(3, "unsupported") == expected
    altered = clarity_transition(3, "es")
    altered["target"]["name"] = "client text"
    altered["source"]["description"] = "client text"
    assert clarity_transition(3, "es") == expected
