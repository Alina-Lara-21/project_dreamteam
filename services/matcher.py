from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many, normalize_text
from services.ai.matcher_ai import match_jobs_with_ai

SKILL_WEIGHT = 0.7
COURSE_WEIGHT = 0.2
PROJECT_WEIGHT = 0.1


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


def _build_job_text(job: Job) -> str:
    return " ".join(
        part for part in [
            job.title,
            job.company,
            job.location or "",
            job.description or "",
            job.requirements or "",
        ]
        if part
    ).lower()


def _match_required_skills(
    user_skills: set[str],
    required_skills: set[str],
    job_text: str,
) -> list[str]:
    matched: list[str] = []
    for required_skill in required_skills:
        if required_skill in user_skills:
            matched.append(required_skill)
            continue

        if any(
            user_skill in required_skill or required_skill in user_skill
            for user_skill in user_skills
        ):
            matched.append(required_skill)
            continue

        if required_skill in job_text:
            matched.append(required_skill)

    return sorted(set(matched))


def _count_profile_matches(terms: list[str], text: str) -> list[str]:
    return sorted({term for term in terms if term and term in text})


def _compute_score(
    required_skills: set[str],
    matched_skills: list[str],
    courses: list[str],
    course_matches: list[str],
    projects: list[str],
    project_matches: list[str],
) -> int:
    skills_score = len(matched_skills) / len(required_skills) if required_skills else 0
    course_score = len(course_matches) / len(courses) if courses else 0
    project_score = len(project_matches) / len(projects) if projects else 0

    total = (
        skills_score * SKILL_WEIGHT
        + course_score * COURSE_WEIGHT
        + project_score * PROJECT_WEIGHT
    )
    return int(min(100, round(total * 100)))


def match_jobs(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    # Try AI matching first, fallback to rule-based if AI fails
    try:
        return match_jobs_with_ai(user_profile, jobs_list)
    except Exception as e:
        print(f"AI matching failed: {e}. Falling back to rule-based matching.")
        return _match_jobs_rule_based(user_profile, jobs_list)


def _match_jobs_rule_based(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    user_skills = set(
        build_user_skill_pool(
            user_profile.skills,
            user_profile.courses,
            user_profile.projects,
        )
    )
    courses = normalize_many(user_profile.courses)
    projects = [project.strip() for project in user_profile.projects if project.strip()]
    resume_text = normalize_text(user_profile.resume_text or "")

    profile_text = " ".join(courses + projects + ([resume_text] if resume_text else [])).lower()

    results: list[MatchResult] = []
    for job in jobs_list:
        required_skills = set(normalize_many(job.skills_required))
        job_text = _build_job_text(job)

        matched_skills = _match_required_skills(user_skills, required_skills, job_text)
        missing_skills = sorted(required_skills.difference(matched_skills))
        course_matches = _count_profile_matches(courses, job_text)
        project_matches = _count_profile_matches(projects, job_text)

        score = _compute_score(
            required_skills,
            matched_skills,
            courses,
            course_matches,
            projects,
            project_matches,
        )

        # Fallback: if there are no required skills, still use profile text matches
        if not required_skills:
            keyword_matches = _count_profile_matches(
                list(user_skills) + courses + projects,
                job_text,
            )
            score = int(min(100, len(keyword_matches) * 10))

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
