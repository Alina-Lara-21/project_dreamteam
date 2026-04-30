import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from models import (
    Job,
    JobsResponse,
    MatchResponse,
    ResumeGenerateResponse,
    SkillGapItem,
    SkillGapResponse,
    UserProfile,
)
from services.matcher import match_jobs
from services.skill_mapper import normalize_many


app = FastAPI(title="The Bridge Matching Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_FILE = Path(__file__).with_name("data") / "jobs.json"


def load_jobs() -> list[Job]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        return []
    return [Job(**job) for job in payload]


def parse_terms(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return normalize_many(raw_value.split(","))


def get_filtered_jobs(
    skills: str | None = None,
    coursework: str | None = None,
    experience: str | None = None,
) -> list[Job]:
    jobs = load_jobs()
    skill_terms = set(parse_terms(skills))
    coursework_terms = set(parse_terms(coursework))
    experience_terms = set(parse_terms(experience))

    if not any([skill_terms, coursework_terms, experience_terms]):
        return jobs

    filtered: list[Job] = []
    for job in jobs:
        searchable = " ".join(
            [
                job.title.lower(),
                job.company.lower(),
                (job.location or "").lower(),
                " ".join(normalize_many(job.skills_required)),
            ]
        )
        required = set(normalize_many(job.skills_required))

        if skill_terms and not skill_terms.issubset(required.union(set(searchable.split()))):
            continue
        if coursework_terms and not coursework_terms.issubset(set(searchable.split())):
            continue
        if experience_terms and not experience_terms.issubset(set(searchable.split())):
            continue
        filtered.append(job)
    return filtered


def _build_resume_bullets(profile: UserProfile) -> list[str]:
    normalized_skills = normalize_many(profile.skills)
    bullets: list[str] = []

    if normalized_skills:
        featured = ", ".join(skill.title() for skill in normalized_skills[:4])
        bullets.append(f"Applied {featured} to deliver software projects in team settings.")
    if profile.projects:
        bullets.append(
            f"Built {len(profile.projects)} project(s) demonstrating practical engineering execution."
        )
    if profile.courses:
        bullets.append(
            "Completed coursework in "
            + ", ".join(course.strip().title() for course in profile.courses[:3])
            + "."
        )
    if profile.resume_text:
        bullets.append("Tailored resume narrative to align with target software engineering roles.")
    if not bullets:
        bullets.append("Developed a foundation in software engineering and problem-solving.")
    return bullets


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/jobs", response_model=JobsResponse)
def get_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> JobsResponse:
    return JobsResponse(jobs=get_filtered_jobs(skills=skills, coursework=coursework, experience=experience))


@app.get("/jobs/filter", response_model=JobsResponse)
def filter_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> JobsResponse:
    return JobsResponse(jobs=get_filtered_jobs(skills=skills, coursework=coursework, experience=experience))


@app.get("/jobs/{job_id}", response_model=Job)
def get_job(job_id: int) -> Job:
    for job in load_jobs():
        if job.id == job_id:
            return job
    raise HTTPException(status_code=404, detail="Job not found")


@app.post("/match", response_model=MatchResponse)
def post_match(profile: UserProfile) -> MatchResponse:
    return MatchResponse(matches=match_jobs(profile, load_jobs()))


@app.post("/skill-gap", response_model=SkillGapResponse)
def skill_gap(profile: UserProfile) -> SkillGapResponse:
    matches = match_jobs(profile, load_jobs())
    return SkillGapResponse(
        results=[
            SkillGapItem(
                job_id=result.job_id,
                title=result.title,
                company=result.company,
                matched_skills=result.matched_skills,
                missing_skills=result.missing_skills,
            )
            for result in matches
        ]
    )


@app.post("/resume/generate", response_model=ResumeGenerateResponse)
def generate_resume(profile: UserProfile) -> ResumeGenerateResponse:
    return ResumeGenerateResponse(bullets=_build_resume_bullets(profile))
