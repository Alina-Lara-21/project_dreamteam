from typing import Any


SKILLS_WEIGHT = 0.6
COURSEWORK_WEIGHT = 0.25
EXPERIENCE_WEIGHT = 0.15


def parse_terms(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return [chunk.strip().lower() for chunk in raw_value.split(",") if chunk.strip()]


def build_job_text(job: dict[str, Any]) -> str:
    text_fields = [
        job.get("title"),
        job.get("company"),
        job.get("location"),
        job.get("description"),
        job.get("requirements"),
    ]
    return " ".join(str(field or "") for field in text_fields).lower()


def job_skill_set(job: dict[str, Any]) -> set[str]:
    values = []
    for key in ("skills", "hard_skills", "soft_skills"):
        raw = job.get(key)
        if isinstance(raw, list):
            values.extend(str(item).strip().lower() for item in raw if str(item).strip())
        elif isinstance(raw, str):
            values.extend(parse_terms(raw))
    return set(values)


def match_ratio(terms: list[str], haystack: str) -> tuple[list[str], float]:
    if not terms:
        return [], 0.0
    matched = [term for term in terms if term in haystack]
    return matched, len(matched) / len(terms)


def skill_ratio(user_skills: list[str], job_skills: set[str], job_text: str) -> tuple[list[str], float]:
    if not user_skills:
        return [], 0.0

    matched = []
    for term in user_skills:
        if term in job_skills or term in job_text:
            matched.append(term)

    return matched, len(matched) / len(user_skills)


def compute_match_result(
    job: dict[str, Any],
    user_skills: list[str],
    coursework_terms: list[str],
    experience_terms: list[str],
) -> dict[str, Any]:
    text = build_job_text(job)
    skills = job_skill_set(job)

    matched_skills, skills_score = skill_ratio(user_skills, skills, text)
    matched_coursework, coursework_score = match_ratio(coursework_terms, text)
    matched_experience, experience_score = match_ratio(experience_terms, text)

    total = (
        skills_score * SKILLS_WEIGHT
        + coursework_score * COURSEWORK_WEIGHT
        + experience_score * EXPERIENCE_WEIGHT
    )
    score = round(total * 100, 2)

    return {
        "job": job,
        "score": score,
        "breakdown": {
            "matched_skills": matched_skills,
            "matched_coursework": matched_coursework,
            "matched_experience": matched_experience,
        },
    }


def rank_jobs(
    jobs: list[dict[str, Any]],
    skills: str | None = None,
    coursework: str | None = None,
    experience: str | None = None,
    top_k: int | None = None,
) -> list[dict[str, Any]]:
    user_skills = parse_terms(skills)
    coursework_terms = parse_terms(coursework)
    experience_terms = parse_terms(experience)

    results = [
        compute_match_result(job, user_skills, coursework_terms, experience_terms)
        for job in jobs
    ]

    results.sort(key=lambda item: item["score"], reverse=True)

    if top_k is not None and top_k > 0:
        return results[:top_k]
    return results
