import re

from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many, unique_sorted


def build_job_text(job: Job) -> str:
    loc = getattr(job, "location", None) or ""
    desc = getattr(job, "description", "") or ""
    jt = getattr(job, "job_type", None) or ""
    req = getattr(job, "requirements", None) or ""
    title = getattr(job, "title", None) or ""
    company = getattr(job, "company", None) or ""
    parts = [
        str(title),
        str(company),
        str(loc),
        str(jt),
        str(desc),
        str(req),
        " ".join(normalize_many(getattr(job, "skills_required", None) or [])),
    ]
    return " ".join(str(p) for p in parts).lower()


def build_user_match_tokens(user: UserProfile) -> list[str]:
    pool: list[str] = []
    pool.extend(build_user_skill_pool(user.skills, user.courses))
    pool.extend(normalize_many(user.projects))
    rt = (user.resume_text or "").strip()
    if rt:
        pool.extend(normalize_many(re.findall(r"[a-z0-9]{2,}", rt.lower())))
    return unique_sorted(pool)


def query_token_overlap_count(job: Job | None, tokens: list[str]) -> int:
    if job is None or not tokens:
        return 0
    hay = build_job_text(job)
    return sum(1 for t in tokens if t and t in hay)


def token_overlap_score(tokens: list[str], hay: str) -> int:
    if not tokens or not hay:
        return 0
    hay_l = hay.lower()
    sig = [t for t in tokens if len(t) >= 2]
    if not sig:
        return 0
    hits = sum(1 for t in sig if t in hay_l)
    if hits == 0:
        return 0
    denom = max(5, min(len(sig), 24))
    return min(100, int(round(100 * hits / denom)))


def _build_explanation(
    matched_skills: list[str],
    courses: list[str],
    projects: list[str],
    overlap_score: int,
) -> str:
    if matched_skills:
        preview = ", ".join(skill.title() for skill in matched_skills[:3])
        source_parts: list[str] = []
        if courses:
            source_parts.append("coursework")
        if projects:
            source_parts.append("projects and profile text")
        source_text = " and ".join(source_parts) if source_parts else "your profile"
        return f"Matched based on your {preview} experience from {source_text}."
    if overlap_score > 0:
        return "Matched based on keyword overlap between your profile and this job's title, description, and role details."
    return "This role has skill gaps based on your current profile."


def match_jobs(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    user_skills = set(build_user_skill_pool(user_profile.skills, user_profile.courses))
    user_skills.update(normalize_many(user_profile.projects))
    courses = normalize_many(user_profile.courses)
    projects = [project.strip() for project in user_profile.projects if project.strip()]
    user_tokens = build_user_match_tokens(user_profile)

    results: list[MatchResult] = []
    for job in jobs_list:
        hay = build_job_text(job)
        overlap = token_overlap_score(user_tokens, hay)

        required_skills = set(normalize_many(getattr(job, "skills_required", None) or []))
        if required_skills:
            matched_skills = sorted(user_skills.intersection(required_skills))
            missing_skills = sorted(required_skills.difference(user_skills))
            skill_score = int((len(matched_skills) / len(required_skills)) * 100)
        else:
            matched_skills = []
            missing_skills = []
            skill_score = 0

        score = max(skill_score, overlap)

        results.append(
            MatchResult(
                job_id=job.id,
                title=job.title,
                company=job.company,
                match_score=score,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                explanation=_build_explanation(matched_skills, courses, projects, overlap),
                salary_range=job.salary_range,
            )
        )

    return sorted(results, key=lambda item: (-item.match_score, item.title.lower()))
