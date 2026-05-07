from app_db.database import Base, engine

import app_db.models  # noqa: F401 — registers ORM tables on Base.metadata for create_all

from routers.progress_session import router as progress_router
from routers.user_saved_jobs import router as saved_jobs_router
from routers.user_progress_state import router as progress_state_router

import json
import logging

from dotenv import load_dotenv
import os

load_dotenv()

from contextlib import asynccontextmanager
from pathlib import Path

try:
    from dotenv import load_dotenv as _load_dotenv
except ImportError:

    def _load_dotenv() -> None:
        return None


from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None  # type: ignore[misc, assignment]

from models import (
    Job,
    JobsResponse,
    MatchResponse,
    ResumeGenerateResponse,
    SkillGapItem,
    SkillGapResponse,
    UserProfile,
)
from services.jobs_mongo import (
    doc_to_job,
    fetch_jobs_cap,
    fetch_jobs_raw,
    find_document_by_numeric_job_id,
    jobs_collection,
    count_jobs,
)
from services.matcher import match_jobs
from services.skill_mapper import normalize_many, split_terms

_load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    uri = (os.environ.get("MONGO_URI") or "").strip()
    force_json = os.environ.get("USE_JSON_JOBS", "").lower() in ("1", "true", "yes")

    if force_json:
        app.state.jobs_backend = "json"
        app.state.mongo_client = None
        app.state.mongo_collection = None
        jobs_count = len(load_jobs_from_json())
        logger.info(
            "Jobs startup source=json fallback_reason=USE_JSON_JOBS total_jobs=%s data_file=%s",
            jobs_count,
            DATA_FILE,
        )
    elif not uri:
        app.state.jobs_backend = "json"
        app.state.mongo_client = None
        app.state.mongo_collection = None
        jobs_count = len(load_jobs_from_json())
        logger.warning(
            "Jobs startup source=json fallback_reason=MONGO_URI_missing total_jobs=%s data_file=%s",
            jobs_count,
            DATA_FILE,
        )
    elif AsyncIOMotorClient is None:
        app.state.jobs_backend = "json"
        app.state.mongo_client = None
        app.state.mongo_collection = None
        jobs_count = len(load_jobs_from_json())
        logger.warning(
            "Jobs startup source=json fallback_reason=motor_missing total_jobs=%s data_file=%s",
            jobs_count,
            DATA_FILE,
        )
    else:
        client = AsyncIOMotorClient(uri)
        app.state.mongo_client = client
        db_name = (os.environ.get("DB_NAME") or os.environ.get("JOBS_DB") or "jobs").strip()
        coll = jobs_collection(client[db_name])

        n = await count_jobs(coll)
        if n == 0:
            app.state.jobs_backend = "json"
            app.state.mongo_collection = None
            jobs_count = len(load_jobs_from_json())
            logger.warning(
                "Jobs startup source=json fallback_reason=mongo_empty total_jobs=%s mongo_db=%s",
                jobs_count,
                db_name,
            )
        else:
            app.state.jobs_backend = "mongo"
            app.state.mongo_collection = coll
            logger.info(
                "Jobs startup source=mongo total_jobs=%s mongo_db=%s",
                n,
                db_name,
            )

    yield

    mc = getattr(app.state, "mongo_client", None)
    if mc is not None:
        mc.close()


app = FastAPI(title="The Bridge Matching Engine API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(progress_router)
app.include_router(saved_jobs_router)
app.include_router(progress_state_router)


DATA_FILE = Path(__file__).with_name("data") / "jobs.json"
MIN_JOBS_FOR_DEMO = 2000


def _expand_jobs_for_demo(jobs: list[Job], minimum_count: int = MIN_JOBS_FOR_DEMO) -> list[Job]:
    if len(jobs) >= minimum_count or not jobs:
        return jobs

    expanded = list(jobs)
    seed_jobs = list(jobs)
    next_id = max(job.id for job in jobs) + 1
    cycle = 1

    while len(expanded) < minimum_count:
        for seed in seed_jobs:
            if len(expanded) >= minimum_count:
                break
            clone = seed.model_dump()
            clone["id"] = next_id
            clone["title"] = f"{seed.title} ({cycle})"
            expanded.append(Job(**clone))
            next_id += 1
        cycle += 1
    return expanded


def load_jobs_from_json() -> list[Job]:
    if not DATA_FILE.exists():
        return []
    with DATA_FILE.open("r", encoding="utf-8") as fh:
        payload = json.load(fh)
    if not isinstance(payload, list):
        return []
    # TODO: verify keys in each job dict match models.Job / dataset export columns
    jobs = [Job(**job) for job in payload]
    return _expand_jobs_for_demo(jobs)


def parse_terms(raw_value: str | None) -> list[str]:
    if not raw_value:
        return []
    return normalize_many(raw_value.split(","))


def get_filtered_jobs(
    jobs: list[Job],
    skills: str | None = None,
    coursework: str | None = None,
    experience: str | None = None,
) -> list[Job]:
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
        required_skills = [skill.lower() for skill in job.skills_required]

        # Demo-friendly skill matching:
        # - OR logic: any provided skill term can match
        # - case-insensitive
        # - partial: "python" matches "python3"
        if skill_terms and not any(
            term in searchable or any(term in required_skill for required_skill in required_skills)
            for term in skill_terms
        ):
            continue
        if coursework_terms and not any(term in searchable for term in coursework_terms):
            continue
        if experience_terms and not any(term in searchable for term in experience_terms):
            continue
        filtered.append(job)

    # Ensure enough results for demo while keeping deterministic ordering.
    if len(filtered) < 10:
        existing_ids = {job.id for job in filtered}
        for job in jobs:
            if len(filtered) >= 10:
                break
            if job.id in existing_ids:
                continue
            filtered.append(job)
            existing_ids.add(job.id)

    print(f"[jobs/filter] returned={len(filtered)} skills={skills!r} coursework={coursework!r} experience={experience!r}")
    return filtered


async def load_jobs_for_match(request: Request) -> list[Job]:
    """# TODO: replace capped load with Mongo $match on user skills for large collections."""
    cap = int(os.environ.get("MATCH_JOB_CAP", "500"))
    if getattr(request.app.state, "jobs_backend", "json") == "json":
        return load_jobs_from_json()[:cap]
    coll = request.app.state.mongo_collection
    docs = await fetch_jobs_cap(coll, cap)
    return [doc_to_job(d) for d in docs]


def _jobs_filter_window(limit: int, filters_active: bool) -> int:
    if not filters_active:
        return limit
    return min(int(os.environ.get("JOBS_FILTER_WINDOW", "800")), max(limit * 25, limit))


async def load_jobs_for_list(
    request: Request,
    *,
    limit: int,
    skip: int,
    skills: str | None,
    coursework: str | None,
    experience: str | None,
) -> list[Job]:
    filters_active = bool(
        parse_terms(skills) or parse_terms(coursework) or parse_terms(experience)
    )

    if getattr(request.app.state, "jobs_backend", "json") == "json":
        all_jobs = load_jobs_from_json()
        filtered = get_filtered_jobs(all_jobs, skills=skills, coursework=coursework, experience=experience)
        return filtered[skip : skip + limit]

    coll = request.app.state.mongo_collection
    window = _jobs_filter_window(limit, filters_active)
    docs = await fetch_jobs_raw(coll, skip=skip, limit=window)
    jobs = [doc_to_job(d) for d in docs]
    jobs = get_filtered_jobs(jobs, skills=skills, coursework=coursework, experience=experience)
    if filters_active:
        jobs = jobs[:limit]
    elif len(jobs) > limit:
        jobs = jobs[:limit]
    return jobs


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
async def get_jobs(
    request: Request,
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
    limit: int = Query(default=50, ge=1, le=500, description="Mongo page size (after filtering)"),
    skip: int = Query(default=0, ge=0, description="Mongo skip offset"),
) -> JobsResponse:
    # TODO: push skill/course/experience filtering into Mongo $match for dataset scale
    jobs = await load_jobs_for_list(
        request,
        limit=limit,
        skip=skip,
        skills=skills,
        coursework=coursework,
        experience=experience,
    )
    return JobsResponse(jobs=jobs)


@app.get("/jobs/filter", response_model=JobsResponse)
async def filter_jobs(
    request: Request,
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
    limit: int = Query(default=50, ge=1, le=500),
    skip: int = Query(default=0, ge=0),
) -> JobsResponse:
    jobs = await load_jobs_for_list(
        request,
        limit=limit,
        skip=skip,
        skills=skills,
        coursework=coursework,
        experience=experience,
    )
    return JobsResponse(jobs=jobs)


@app.get("/jobs/{job_id}", response_model=Job)
async def get_job(request: Request, job_id: int) -> Job:
    if getattr(request.app.state, "jobs_backend", "json") == "json":
        for job in load_jobs_from_json():
            if job.id == job_id:
                return job
        raise HTTPException(status_code=404, detail="Job not found")

    doc = await find_document_by_numeric_job_id(request.app.state.mongo_collection, job_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return doc_to_job(doc)


@app.post("/match", response_model=MatchResponse)
async def post_match(request: Request, profile: UserProfile) -> MatchResponse:
    jobs = await load_jobs_for_match(request)
    return MatchResponse(matches=match_jobs(profile, jobs))


@app.post("/skill-gap", response_model=SkillGapResponse)
async def skill_gap(request: Request, profile: UserProfile) -> SkillGapResponse:
    jobs = await load_jobs_for_match(request)
    matches = match_jobs(profile, jobs)
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


@app.post("/profile/analyze")
def analyze_profile(profile: UserProfile) -> dict:
    """Extract keywords from resume text without external AI."""
    terms = split_terms(profile.resume_text or "")
    extracted_terms = [term for term in terms if len(term) > 2]
    return {"extracted": ", ".join(extracted_terms[:50])}


# Serve the HTML/CSS/JS app from the project root.
_ROOT = Path(__file__).resolve().parent


@app.get("/")
def serve_index():
    return FileResponse(_ROOT / "index.html")


@app.get("/compare")
def serve_compare():
    return FileResponse(_ROOT / "compare.html")


@app.get("/tracker")
def serve_tracker():
    return FileResponse(_ROOT / "tracker.html")


@app.get("/profile")
def serve_profile():
    return FileResponse(_ROOT / "profile.html")


@app.get("/explore")
def serve_explore():
    return FileResponse(_ROOT / "explore.html")


@app.get("/search")
def serve_search():
    return FileResponse(_ROOT / "search.html")


@app.get("/saved")
def serve_saved():
    return FileResponse(_ROOT / "saved.html")


@app.get("/homepage")
def serve_homepage():
    return FileResponse(_ROOT / "homepage.html")


@app.get("/job")
def serve_job():
    return FileResponse(_ROOT / "job.html")


# Explicit *.html routes — bookmarks and some clients request these paths while "/"
# serves the jobs page; without these, GET /index.html returned 404 on deploy.
@app.get("/index.html")
def serve_index_html():
    return FileResponse(_ROOT / "index.html")


@app.get("/compare.html")
def serve_compare_html():
    return FileResponse(_ROOT / "compare.html")


@app.get("/tracker.html")
def serve_tracker_html():
    return FileResponse(_ROOT / "tracker.html")


@app.get("/profile.html")
def serve_profile_html():
    return FileResponse(_ROOT / "profile.html")


@app.get("/explore.html")
def serve_explore_html():
    return FileResponse(_ROOT / "explore.html")


@app.get("/search.html")
def serve_search_html():
    return FileResponse(_ROOT / "search.html")


@app.get("/saved.html")
def serve_saved_html():
    return FileResponse(_ROOT / "saved.html")


@app.get("/homepage.html")
def serve_homepage_html():
    return FileResponse(_ROOT / "homepage.html")


@app.get("/job.html")
def serve_job_html():
    return FileResponse(_ROOT / "job.html")


app.mount("/static", StaticFiles(directory=str(_ROOT)), name="static")
