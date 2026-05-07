from app_db.database import Base, engine

import app_db.models  # noqa: F401 — registers ORM tables on Base.metadata for create_all

from routers.progress_session import router as progress_router
from routers.user_profile_preferences import router as profile_prefs_router
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


from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

try:
    from motor.motor_asyncio import AsyncIOMotorClient
except ImportError:
    AsyncIOMotorClient = None  # type: ignore[misc, assignment]

from models import (
    AiSearchRequest,
    AiSearchResponse,
    Job,
    JobsResponse,
    MatchResponse,
    ResumeGenerateResponse,
    SkillGapItem,
    SkillGapResponse,
    UserProfile,
)
from services.job_record import normalize_job_record
from services.jobs_mongo import (
    doc_to_job,
    fetch_jobs_cap,
    fetch_jobs_raw,
    find_document_by_numeric_job_id,
    jobs_collection,
    count_jobs,
)
from services.matcher import match_jobs
from services.profile_preferences import load_preferences_map, merge_job_filters, merge_user_profile
from services.skill_mapper import normalize_many

from app_db.database import get_db
from app_db.deps import DependencyOptionalProgressUser
from app_db.sqlite_migrate import ensure_user_progress_state_columns
from sqlalchemy.orm import Session

_load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_user_progress_state_columns()

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
            app.state.mongo_total_jobs = n
            logger.info(
                "Jobs startup source=mongo total_jobs=%s mongo_db=%s",
                n,
                db_name,
            )

    if getattr(app.state, "jobs_backend", "json") == "mongo":
        app.state.total_jobs_available = int(getattr(app.state, "mongo_total_jobs", 0))
    else:
        app.state.total_jobs_available = len(load_jobs_from_json())

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
app.include_router(profile_prefs_router)
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
    jobs = [Job(**normalize_job_record(dict(job))) for job in payload if isinstance(job, dict)]
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
    location: str | None = None,
    job_types: str | None = None,
) -> list[Job]:
    skill_terms = set(parse_terms(skills))
    coursework_terms = set(parse_terms(coursework))
    experience_terms = set(parse_terms(experience))

    if not any([skill_terms, coursework_terms, experience_terms]):
        filtered = list(jobs)
    else:
        filtered = []
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

    if location_terms := parse_terms(location):
        loc_lower = [t.lower() for t in location_terms]
        filtered = [
            j
            for j in filtered
            if j.location and any(t in j.location.lower() for t in loc_lower)
        ]

    if job_type_terms := parse_terms(job_types):
        jt_lower = [t.lower() for t in job_type_terms]
        filtered = [
            j for j in filtered if any(t in (j.job_type or "").lower() for t in jt_lower)
        ]

    logger.info(
        "jobs/filter pipeline returned=%s skills=%r coursework=%r experience=%r location=%r job_types=%r",
        len(filtered),
        skills,
        coursework,
        experience,
        location,
        job_types,
    )
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
    location: str | None = None,
    job_types: str | None = None,
) -> list[Job]:
    filters_active = bool(
        parse_terms(skills)
        or parse_terms(coursework)
        or parse_terms(experience)
        or parse_terms(location)
        or parse_terms(job_types)
    )

    if getattr(request.app.state, "jobs_backend", "json") == "json":
        all_jobs = load_jobs_from_json()
        filtered = get_filtered_jobs(
            all_jobs,
            skills=skills,
            coursework=coursework,
            experience=experience,
            location=location,
            job_types=job_types,
        )
        return filtered[skip : skip + limit]

    coll = request.app.state.mongo_collection
    window = _jobs_filter_window(limit, filters_active)
    docs = await fetch_jobs_raw(coll, skip=skip, limit=window)
    jobs = [doc_to_job(d) for d in docs]
    jobs = get_filtered_jobs(
        jobs,
        skills=skills,
        coursework=coursework,
        experience=experience,
        location=location,
        job_types=job_types,
    )
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


def _job_text_blob(job: Job) -> str:
    return " ".join(
        [
            job.title,
            job.description,
            job.job_type,
            job.company,
            job.location or "",
            " ".join(job.skills_required),
        ]
    ).lower()


@app.get("/jobs", response_model=JobsResponse)
async def get_jobs(
    request: Request,
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
    location: str | None = Query(default=None, description="Location substring filter"),
    job_types: str | None = Query(default=None, description="Comma-separated job type terms"),
    limit: int = Query(default=2000, ge=1, le=5000, description="Page size after filtering"),
    skip: int = Query(default=0, ge=0, description="Skip offset"),
    apply_saved_profile: bool = Query(
        default=True,
        description="When X-Progress-Code is sent, merge saved SQLite preferences unless false",
    ),
) -> JobsResponse:
    prefs = load_preferences_map(db, learner.id) if learner else {}
    use_saved = bool(learner and apply_saved_profile)
    ms, mc, me, ml, mj = merge_job_filters(
        prefs,
        skills=skills,
        coursework=coursework,
        experience=experience,
        location=location,
        job_types=job_types,
        apply_saved=use_saved,
    )
    jobs = await load_jobs_for_list(
        request,
        limit=limit,
        skip=skip,
        skills=ms,
        coursework=mc,
        experience=me,
        location=ml,
        job_types=mj,
    )
    total_avail = int(getattr(request.app.state, "total_jobs_available", 0))
    logger.info(
        "GET /jobs source=%s returned=%s total_available=%s skip=%s limit=%s",
        getattr(request.app.state, "jobs_backend", "?"),
        len(jobs),
        total_avail,
        skip,
        limit,
    )
    return JobsResponse(jobs=jobs)


@app.get("/jobs/filter", response_model=JobsResponse)
async def filter_jobs(
    request: Request,
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
    skills: str | None = Query(default=None, description="Comma-separated skills"),
    coursework: str | None = Query(default=None, description="Comma-separated coursework terms"),
    experience: str | None = Query(default=None, description="Comma-separated experience terms"),
    location: str | None = Query(default=None),
    job_types: str | None = Query(default=None),
    limit: int = Query(default=2000, ge=1, le=5000),
    skip: int = Query(default=0, ge=0),
    apply_saved_profile: bool = Query(default=True),
) -> JobsResponse:
    prefs = load_preferences_map(db, learner.id) if learner else {}
    use_saved = bool(learner and apply_saved_profile)
    ms, mc, me, ml, mj = merge_job_filters(
        prefs,
        skills=skills,
        coursework=coursework,
        experience=experience,
        location=location,
        job_types=job_types,
        apply_saved=use_saved,
    )
    jobs = await load_jobs_for_list(
        request,
        limit=limit,
        skip=skip,
        skills=ms,
        coursework=mc,
        experience=me,
        location=ml,
        job_types=mj,
    )
    total_avail = int(getattr(request.app.state, "total_jobs_available", 0))
    logger.info(
        "GET /jobs/filter source=%s returned=%s total_available=%s skip=%s limit=%s",
        getattr(request.app.state, "jobs_backend", "?"),
        len(jobs),
        total_avail,
        skip,
        limit,
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


def _match_payload_item(match: dict, job: Job | None) -> dict:
    # TODO: verify if frontend should consume only camelCase once old clients are migrated.
    job_id = match["job_id"]
    title = job.title if job else match["title"]
    company = job.company if job else match["company"]
    location = job.location if job else None
    description = job.description if job else "Description not provided."
    skills_required = job.skills_required if job else []
    match_reason = match["explanation"]
    return {
        "job_id": job_id,
        "match_score": match["match_score"],
        "matched_skills": match["matched_skills"],
        "missing_skills": match["missing_skills"],
        "explanation": match_reason,
        "id": job_id,
        "title": title,
        "company": company,
        "location": location,
        "description": description,
        "skills_required": skills_required,
        "matchScore": match["match_score"],
        "matchReason": match_reason,
        "matchedSkills": match["matched_skills"],
        "missingSkills": match["missing_skills"],
    }


@app.post("/match")
async def post_match(
    request: Request,
    profile: UserProfile,
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
    apply_saved_profile: bool = Query(default=True),
) -> dict[str, list[dict]]:
    prefs = load_preferences_map(db, learner.id) if learner else {}
    effective = merge_user_profile(prefs, profile) if (learner and apply_saved_profile) else profile
    jobs = await load_jobs_for_match(request)
    raw_matches = match_jobs(effective, jobs)
    by_job_id = {job.id: job for job in jobs}
    payload = [_match_payload_item(m.model_dump(), by_job_id.get(m.job_id)) for m in raw_matches]
    return {"matches": payload}


@app.post("/skill-gap", response_model=SkillGapResponse)
async def skill_gap(
    request: Request,
    profile: UserProfile,
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
    apply_saved_profile: bool = Query(default=True),
) -> SkillGapResponse:
    prefs = load_preferences_map(db, learner.id) if learner else {}
    effective = merge_user_profile(prefs, profile) if (learner and apply_saved_profile) else profile
    jobs = await load_jobs_for_match(request)
    matches = match_jobs(effective, jobs)
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


@app.post("/ai/search", response_model=AiSearchResponse)
async def ai_search(
    request: Request,
    body: AiSearchRequest,
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
    apply_saved_profile: bool = Query(default=True),
) -> AiSearchResponse:
    prefs = load_preferences_map(db, learner.id) if learner else {}
    profile = UserProfile(
        skills=body.skills,
        courses=body.courses,
        projects=body.projects,
        resume_text=body.resume_text,
    )
    effective = merge_user_profile(prefs, profile) if (learner and apply_saved_profile) else profile

    jobs_pool = await load_jobs_for_match(request)
    q = (body.query or "").strip().lower()
    if q:
        text_filtered = [job for job in jobs_pool if q in _job_text_blob(job)]
    else:
        text_filtered = list(jobs_pool)

    ranked = match_jobs(effective, text_filtered)
    top = ranked[: body.limit]
    by_id = {job.id: job for job in text_filtered}
    jobs_out = [by_id[m.job_id] for m in top if m.job_id in by_id]
    logger.info(
        "POST /ai/search source=%s query_len=%s candidate_jobs=%s returned_jobs=%s",
        getattr(request.app.state, "jobs_backend", "?"),
        len(q),
        len(text_filtered),
        len(jobs_out),
    )
    return AiSearchResponse(jobs=jobs_out, matches=top)


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
