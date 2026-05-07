import re
from collections.abc import Iterable


COURSE_SKILL_MAP: dict[str, list[str]] = {
    "data structures": ["algorithms", "problem solving"],
    "databases": ["sql", "data modeling"],
    "machine learning": ["python", "data analysis", "statistics"],
    "web development": ["html", "css", "javascript"],
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


def split_terms(value: str) -> list[str]:
    return [term for term in re.split(r"[^a-z0-9]+", normalize_text(value)) if term]


def expand_skills_from_courses(courses: Iterable[str]) -> list[str]:
    expanded: list[str] = []
    for course in normalize_many(courses):
        expanded.extend(COURSE_SKILL_MAP.get(course, []))
    return unique_sorted(expanded)


def extract_terms_from_projects(projects: Iterable[str]) -> list[str]:
    expanded: list[str] = []
    for project in projects:
        expanded.extend(split_terms(str(project)))
    return unique_sorted(expanded)


def build_user_skill_pool(skills: Iterable[str], courses: Iterable[str], projects: Iterable[str] = ()) -> list[str]:
    combined = list(normalize_many(skills))
    combined.extend(expand_skills_from_courses(courses))
    combined.extend(extract_terms_from_projects(projects))
    return unique_sorted(combined)
