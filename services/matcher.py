from models import Job, MatchResult, UserProfile
from services.skill_mapper import build_user_skill_pool, normalize_many


def _sentence_20_words(text: str) -> str:
    words = text.strip().split()
    if len(words) > 20:
        words = words[:20]
    out = " ".join(words).rstrip(".!?")
    return f"{out}."


def generate_match_reason(profile: UserProfile, job: Job, score: int) -> str:
    user_skills = set(build_user_skill_pool(profile.skills, profile.courses))
    required_skills = set(normalize_many(job.skills_required))
    matched = sorted(user_skills.intersection(required_skills))
    coursework = [c.strip() for c in profile.courses if c.strip()]
    projects = [p.strip() for p in profile.projects if p.strip()]

    if score >= 80 and matched:
        top = ", ".join(matched[:2])
        return _sentence_20_words(f"Your {top} skills align strongly with this role's requirements")
    if score >= 60 and coursework:
        top_course = ", ".join(coursework[:2])
        return _sentence_20_words(f"Your coursework in {top_course} supports this job's core responsibilities")
    if projects:
        top_project = ", ".join(projects[:2])
        return _sentence_20_words(f"Your project experience in {top_project} can help bridge remaining skill gaps")
    return _sentence_20_words("Your background shows partial alignment, and this role can grow your practical skills")


def match_jobs(user_profile: UserProfile, jobs_list: list[Job]) -> list[MatchResult]:
    user_skills = set(build_user_skill_pool(user_profile.skills, user_profile.courses))

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
                explanation=generate_match_reason(user_profile, job, score),
                salary_range=job.salary_range,
            )
        )

    return sorted(results, key=lambda item: (-item.match_score, item.title.lower()))
