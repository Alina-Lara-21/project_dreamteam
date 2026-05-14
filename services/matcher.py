import re
from typing import Any

from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many, unique_sorted


def read_field(obj: Any, field: str, default: Any = None) -> Any:
    if isinstance(obj, dict):
        return obj.get(field, default)
    return getattr(obj, field, default)


def build_job_text(job: Job) -> str:
    loc = read_field(job, "location", "") or ""
    desc = read_field(job, "description", "") or ""
    jt = read_field(job, "job_type", "") or ""
    req = read_field(job, "requirements", "") or ""
    title = read_field(job, "title", "") or ""
    company = read_field(job, "company", "") or ""
    parts = [
        str(title),
        str(company),
        str(loc),
        str(jt),
        str(desc),
        str(req),
        " ".join(normalize_many(read_field(job, "skills_required", None) or [])),
    ]
    return " ".join(str(p) for p in parts).lower()


def _job_title_lower(job: Job) -> str:
    return str(read_field(job, "title", "") or "").lower()


def _hay_profile_text_match(job: Job) -> str:
    """Title + description + required skills text (for profile/education overlap)."""
    parts = [
        str(read_field(job, "title", "") or ""),
        str(read_field(job, "description", "") or ""),
        " ".join(normalize_many(read_field(job, "skills_required", None) or [])),
    ]
    return " ".join(parts).lower()


def build_user_match_tokens(user: UserProfile) -> list[str]:
    """Broad token pool (skills, courses, projects, resume) — used by AI search helpers."""
    pool: list[str] = []
    pool.extend(build_user_skill_pool(user.skills, user.courses))
    pool.extend(normalize_many(user.projects))
    rt = (user.resume_text or "").strip()
    if rt:
        pool.extend(normalize_many(re.findall(r"[a-z0-9]{2,}", rt.lower())))
    return unique_sorted(pool)


def _tokens_from_profile_free_text(user: UserProfile) -> list[str]:
    """Experience + education + resume text only (not standalone skills list)."""
    parts: list[str] = []
    for p in user.projects or []:
        s = str(p).strip()
        if s:
            parts.append(s)
    if user.resume_text:
        parts.append(str(user.resume_text).strip())
    blob = " ".join(parts).lower()
    if not blob.strip():
        return []
    return unique_sorted(normalize_many(re.findall(r"[a-z0-9]{2,}", blob)))


def _ratio_tokens_in_hay(tokens: list[str], hay: str) -> int:
    if not hay or not tokens:
        return 0
    hay_l = hay.lower()
    sig = [t for t in tokens if len(t) >= 2]
    if not sig:
        return 0
    hits = sum(1 for t in sig if t in hay_l)
    return min(100, int(round(100 * hits / len(sig))))


def query_token_overlap_count(job: Job | None, tokens: list[str]) -> int:
    if job is None or not tokens:
        return 0
    hay = build_job_text(job)
    return sum(1 for t in tokens if t and t in hay)


def _build_explanation(
    matched_skills: list[str],
    courses: list[str],
    projects: list[str],
    profile_text_match: int,
    keyword_overlap: int,
) -> str:
    if matched_skills:
        preview = ", ".join(skill.title() for skill in matched_skills[:3])
        source_parts: list[str] = []
        if courses:
            source_parts.append("coursework")
        if projects:
            source_parts.append("experience and profile text")
        source_text = " and ".join(source_parts) if source_parts else "your profile"
        return f"Matched based on your {preview} from {source_text}."
    if profile_text_match > 0 or keyword_overlap > 0:
        return "Matched based on overlap between your saved experience, education, and this job's title and description."
    return "This role has skill gaps based on your current profile."


def match_jobs(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    user_pool_req = set(build_user_skill_pool(user_profile.skills, user_profile.courses))
    courses = normalize_many(user_profile.courses)
    projects = [project.strip() for project in user_profile.projects if project.strip()]
    profile_text_tokens = _tokens_from_profile_free_text(user_profile)

    results: list[MatchResult] = []
    for job in jobs_list:
        required_skills = set(normalize_many(read_field(job, "skills_required", None) or []))
        if required_skills:
            matched_skills = sorted(user_pool_req & required_skills)
            missing_skills = sorted(required_skills - user_pool_req)
            required_skills_fit = int(round(100 * len(matched_skills) / len(required_skills)))
        else:
            matched_skills = []
            missing_skills = []
            required_skills_fit = 0

        hay_profile = _hay_profile_text_match(job)
        profile_text_match = _ratio_tokens_in_hay(profile_text_tokens, hay_profile)

        title_hay = _job_title_lower(job)
        keyword_overlap = _ratio_tokens_in_hay(profile_text_tokens, title_hay)

        total_match = int(
            round((required_skills_fit + profile_text_match + keyword_overlap) / 3.0),
        )

        results.append(
            MatchResult(
                job_id=read_field(job, "id"),
                title=str(read_field(job, "title", "") or ""),
                company=str(read_field(job, "company", "") or ""),
                match_score=total_match,
                required_skills_fit=required_skills_fit,
                profile_text_match=profile_text_match,
                keyword_overlap=keyword_overlap,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                explanation=_build_explanation(
                    matched_skills,
                    courses,
                    projects,
                    profile_text_match,
                    keyword_overlap,
                ),
                salary_range=read_field(job, "salary_range", None),
            ),
        )

    return sorted(results, key=lambda item: (-item.match_score, item.title.lower()))
