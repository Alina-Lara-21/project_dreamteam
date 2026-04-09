import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(title="Career Path API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_FILE = Path(__file__).with_name("jobs.json")


def load_jobs() -> list[dict[str, Any]]:
    if not DATA_FILE.exists():
        return []

    with DATA_FILE.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)

    if isinstance(payload, list):
        return payload

    return []


def parse_terms(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []

    terms: list[str] = []
    for chunk in raw_value.split(","):
        normalized = chunk.strip().lower()
        if normalized:
            terms.append(normalized)
    return terms


def job_text_blob(job: dict[str, Any]) -> str:
    text_fields = [
        job.get("title"),
        job.get("company"),
        job.get("location"),
        job.get("description"),
        job.get("requirements"),
        job.get("skills_desc"),
        job.get("formatted_experience_level"),
    ]
    return " ".join(str(field or "") for field in text_fields).lower()


def job_skill_values(job: dict[str, Any]) -> list[str]:
    skills = job.get("skills")
    if isinstance(skills, list):
        return [str(skill).strip().lower() for skill in skills if str(skill).strip()]
    if isinstance(skills, str):
        return parse_terms(skills)
    return []


def matches_filters(
    job: dict[str, Any], skills: list[str], coursework: list[str], experience: list[str]
) -> bool:
    text_blob = job_text_blob(job)
    skill_values = job_skill_values(job)

    if skills and not all(
        any(term in skill for skill in skill_values) or term in text_blob for term in skills
    ):
        return False

    if coursework and not all(term in text_blob for term in coursework):
        return False

    if experience and not all(term in text_blob for term in experience):
        return False

    return True


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/jobs")
def get_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> list[dict[str, Any]]:
    skill_terms = parse_terms(skills)
    coursework_terms = parse_terms(coursework)
    experience_terms = parse_terms(experience)

    jobs = load_jobs()
    if not any([skill_terms, coursework_terms, experience_terms]):
        return jobs

    return [
        job
        for job in jobs
        if matches_filters(job, skill_terms, coursework_terms, experience_terms)
    ]


@app.get("/jobs/filter")
def filter_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> list[dict[str, Any]]:
    return get_jobs(skills=skills, coursework=coursework, experience=experience)
