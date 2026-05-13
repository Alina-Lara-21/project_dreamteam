from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many


def build_job_text(job: Job) -> str:
    loc = getattr(job, "location", None) or ""
    desc = getattr(job, "description", "") or ""
    jt = getattr(job, "job_type", None) or ""
    req = getattr(job, "requirements", None) or ""
    parts = [
        job.title,
        job.company,
        str(loc),
        str(jt),
        str(desc),
        str(req),
        " ".join(normalize_many(job.skills_required)),
    ]
    return " ".join(str(p) for p in parts).lower()


def query_token_overlap_count(job: Job | None, tokens: list[str]) -> int:
    if job is None or not tokens:
        return 0
    hay = build_job_text(job)
    return sum(1 for t in tokens if t and t in hay)


def _build_explanation(
    matched_skills: list[str],
    courses: list[str],
    projects: list[str],
) -> str:
    if matched_skills:
        preview = ", ".join(skill.title() for skill in matched_skills[:3])
        source_parts: list[str] = []
        if courses:
            source_parts.append("coursework")
        if projects:
            source_parts.append("projects")
        source_text = " and ".join(source_parts) if source_parts else "your profile"
        return f"Matched based on your {preview} experience from {source_text}."
    return "This role has skill gaps based on your current profile."


def match_jobs(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    user_skills = set(build_user_skill_pool(user_profile.skills, user_profile.courses))
    courses = normalize_many(user_profile.courses)
    projects = [project.strip() for project in user_profile.projects if project.strip()]

    results: list[MatchResult] = []
    for job in jobs_list:
        required_skills = set(normalize_many(job.skills_required))
        if required_skills:
            matched_skills = sorted(user_skills.intersection(required_skills))
            missing_skills = sorted(required_skills.difference(user_skills))
            score = int((len(matched_skills) / len(required_skills)) * 100)
        else:
            matched_skills = []
            missing_skills = []
            score = 0

        results.append(
            MatchResult(
                job_id=job.id,
                title=job.title,
                company=job.company,
                match_score=score,
                matched_skills=matched_skills,
                missing_skills=missing_skills,
                explanation=_build_explanation(matched_skills, courses, projects),
                salary_range=job.salary_range,
            )
        )

    return sorted(results, key=lambda item: (-item.match_score, item.title.lower()))
