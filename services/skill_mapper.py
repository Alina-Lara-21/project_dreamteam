from collections.abc import Iterable


COURSE_SKILL_MAP: dict[str, list[str]] = {
    "data structures": ["algorithms", "problem solving"],
    "databases": ["sql", "data modeling"],
}


def normalize_text(value: str) -> str:
    return value.strip().lower()


def normalize_many(values: Iterable[str]) -> list[str]:
    normalized: list[str] = []
    for value in values:
        cleaned = normalize_text(str(value))
        if cleaned:
            normalized.append(cleaned)
    return normalized


def unique_sorted(values: Iterable[str]) -> list[str]:
    return sorted(set(normalize_many(values)))


def expand_skills_from_courses(courses: Iterable[str]) -> list[str]:
    expanded: list[str] = []
    for course in normalize_many(courses):
        expanded.extend(COURSE_SKILL_MAP.get(course, []))
    return unique_sorted(expanded)


def build_user_skill_pool(skills: Iterable[str], courses: Iterable[str]) -> list[str]:
    combined = list(normalize_many(skills))
    combined.extend(expand_skills_from_courses(courses))
    return unique_sorted(combined)
