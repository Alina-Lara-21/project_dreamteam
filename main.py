import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from matching import rank_jobs
from skill_extraction import extract_skills


app = FastAPI(title="Career Path API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


DATA_FILE = Path(__file__).with_name("jobs.json")


def to_list_of_strings(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        return [item.strip() for item in value.split(",") if item.strip()]
    return []


def normalize_job(job: dict[str, Any], fallback_id: int) -> dict[str, Any]:
    job_id = job.get("id")
    if job_id in (None, ""):
        job_id = job.get("job_id")
    if job_id in (None, ""):
        job_id = fallback_id

    title = str(job.get("title") or "Untitled role")
    company = str(job.get("company") or job.get("company_name") or "Unknown company")
    location = str(job.get("location") or "Location not listed")
    description = str(job.get("description") or "")
    requirements = str(job.get("requirements") or job.get("skills_desc") or "")

    extracted = extract_skills(
        description=description,
        requirements=requirements,
        existing_skills=job.get("skills"),
    )
    skills = sorted(set(extracted["skills"] + to_list_of_strings(job.get("skills"))))
    soft_skills = sorted(
        set(extracted["soft_skills"] + to_list_of_strings(job.get("soft_skills")))
    )
    hard_skills = sorted(
        set(extracted["hard_skills"] + to_list_of_strings(job.get("hard_skills")))
    )

    return {
        "id": job_id,
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "requirements": requirements,
        "skills": skills,
        "soft_skills": soft_skills,
        "hard_skills": hard_skills,
    }


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


def get_filtered_jobs(
    skills: str | None = None,
    coursework: str | None = None,
    experience: str | None = None,
) -> list[dict[str, Any]]:
    skill_terms = parse_terms(skills)
    coursework_terms = parse_terms(coursework)
    experience_terms = parse_terms(experience)

    jobs = load_jobs()
    if not any([skill_terms, coursework_terms, experience_terms]):
        filtered_jobs = jobs
    else:
        filtered_jobs = [
            job
            for job in jobs
            if matches_filters(job, skill_terms, coursework_terms, experience_terms)
        ]

    return [normalize_job(job, index + 1) for index, job in enumerate(filtered_jobs)]


def jobs_response(
    skills: str | None = None,
    coursework: str | None = None,
    experience: str | None = None,
) -> dict[str, Any]:
    jobs = get_filtered_jobs(skills=skills, coursework=coursework, experience=experience)
    return {"status": "ok", "count": len(jobs), "jobs": jobs}


@app.get("/jobs/filter")
def filter_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> dict[str, Any]:
    return jobs_response(skills=skills, coursework=coursework, experience=experience)


@app.get("/jobs")
def get_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
) -> dict[str, Any]:
    return jobs_response(skills=skills, coursework=coursework, experience=experience)


@app.get("/jobs/match")
def match_jobs(
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
    top_k: int | None = Query(default=None, description="Optional number of top results"),
) -> dict[str, Any]:
    jobs = get_filtered_jobs()
    results = rank_jobs(
        jobs=jobs,
        skills=skills,
        coursework=coursework,
        experience=experience,
        top_k=top_k,
    )
    return {"status": "ok", "count": len(results), "results": results}
