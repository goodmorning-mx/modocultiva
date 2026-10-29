"""Versioned clarity rubric shared (and equality-tested) with the client.

The current assessment remains distinct from a verified next-level transition.
Review submissions must take their target from this server-owned rubric, not a
client-provided description. Level 9 is still the separate image-only vision.
"""

from functools import lru_cache
import json
from pathlib import Path


@lru_cache(maxsize=1)
def _rubric() -> dict:
    return json.loads(Path(__file__).with_name("clarity_levels.json").read_text(encoding="utf-8"))


def clarity_transition(level: int, language: str = "es") -> dict:
    if type(level) is not int or not 0 <= level <= 8:
        raise ValueError("Only activity levels 0–8 have a next-level clarity target.")
    rubric = _rubric()
    entries = rubric["languages"].get(language, rubric["languages"]["es"])
    return {
        "version": rubric["version"],
        "source": dict(entries[level]),
        "target": dict(entries[level + 1]),
        "effort": "time" if level <= 2 else "time_energy" if level <= 5 else "time_energy_investment",
    }


def activity_alignment_instruction(level: int, language: str = "es") -> str:
    transition = clarity_transition(level, language)
    target = transition["target"]
    return (
        "REGLA DE CONGRUENCIA: No basta con definir y realizar una tarea en el nivel actual. "
        "La actividad debe estar alineada con la claridad del siguiente nivel; realizarla debe ayudar "
        "a la persona a reconocerse en su descripción. No garantices el avance por cumplir una tarea. "
        "Explica qué cambio observable mostraría esa nueva claridad y qué evidencia permitiría revisarlo. "
        "No exijas gastos arbitrarios ni prometas resultados personales.\n"
        f"Nivel objetivo de claridad: {target['level']} · {target['name']}\n"
        f"Descripción oficial del siguiente nivel: {target['description']}\n"
        f"Rúbrica: {transition['version']}\n"
    )
