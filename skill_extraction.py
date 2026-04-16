from typing import Any


HARD_SKILL_KEYWORDS = {
    "python",
    "java",
    "sql",
    "git",
    "fastapi",
    "javascript",
    "html",
    "css",
}

SOFT_SKILL_KEYWORDS = {
    "communication",
    "teamwork",
    "leadership",
    "problem solving",
    "time management",
}


def to_terms(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip().lower() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip().lower() for item in value.split(",") if item.strip()]
    return []


def build_text_blob(description: Any, requirements: Any, existing_skills: Any) -> str:
    parts = [str(description or ""), str(requirements or "")]
    parts.extend(to_terms(existing_skills))
    return " ".join(parts).lower()


def extract_skills(description: Any, requirements: Any, existing_skills: Any = None) -> dict[str, list[str]]:
    text_blob = build_text_blob(description, requirements, existing_skills)

    hard_skills = sorted(
        [skill for skill in HARD_SKILL_KEYWORDS if skill in text_blob]
    )
    soft_skills = sorted(
        [skill for skill in SOFT_SKILL_KEYWORDS if skill in text_blob]
    )

    combined_skills = sorted(set(to_terms(existing_skills) + hard_skills + soft_skills))

    return {
        "skills": combined_skills,
        "hard_skills": hard_skills,
        "soft_skills": soft_skills,
    }
