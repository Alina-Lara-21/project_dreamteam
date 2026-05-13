from datetime import datetime, timezone
from io import BytesIO

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.deps import DependencyOptionalProgressUser, DependencyProgressUser
from app_db.models import UserProfile as UserProfileRow
from app_db.schemas import ProfileResponse, ProfileSave
from skill_extraction import extract_skills

router = APIRouter(tags=["user_profile"])


def _empty_profile(user_id: str) -> ProfileResponse:
    return ProfileResponse(
        user_id=user_id,
        updated_at="",
        full_name="",
        email="",
        skills="",
        coursework="",
        experience="",
        location="",
        job_types="",
        resume_text="",
        experience_entries_json="[]",
        education_json="[]",
    )


def _to_response(row: UserProfileRow) -> ProfileResponse:
    return ProfileResponse(
        user_id=row.user_id,
        updated_at=row.updated_at or "",
        full_name=row.full_name or "",
        email=row.email or "",
        skills=row.skills or "",
        coursework=row.coursework or "",
        experience=row.experience or "",
        location=row.location or "",
        job_types=row.job_types or "",
        resume_text=row.resume_text or "",
        experience_entries_json=getattr(row, "experience_entries_json", None) or "[]",
        education_json=getattr(row, "education_json", None) or "[]",
    )


@router.get("/profile/data", response_model=ProfileResponse)
def get_profile_data(
    learner: DependencyOptionalProgressUser,
    db: Session = Depends(get_db),
):
    if learner is None:
        return _empty_profile("")
    user_id = str(learner.id)
    row = db.query(UserProfileRow).filter(UserProfileRow.user_id == user_id).first()
    if row is None:
        return _empty_profile(user_id)
    return _to_response(row)


@router.post("/profile/data", response_model=ProfileResponse)
def save_profile_data(
    payload: ProfileSave,
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    user_id = str(learner.id)
    row = db.query(UserProfileRow).filter(UserProfileRow.user_id == user_id).first()
    if row is None:
        row = UserProfileRow(user_id=user_id)
        db.add(row)

    row.full_name = payload.full_name
    row.email = payload.email
    row.skills = payload.skills
    row.coursework = payload.coursework
    row.experience = payload.experience
    row.location = payload.location
    row.job_types = payload.job_types
    row.resume_text = payload.resume_text
    row.experience_entries_json = payload.experience_entries_json or "[]"
    row.education_json = payload.education_json or "[]"
    row.updated_at = datetime.now(timezone.utc).isoformat()

    db.commit()
    db.refresh(row)
    return _to_response(row)


@router.post("/profile/resume")
async def parse_resume_pdf(
    _learner: DependencyProgressUser,
    file: UploadFile = File(...),
):
    raw = await file.read()
    if not raw:
        return {"skills": []}
    try:
        from pdfminer.high_level import extract_text
    except ImportError:
        return {"skills": []}
    text = extract_text(BytesIO(raw)) or ""
    extracted = extract_skills(text, "", None)
    skills = extracted.get("skills") or []
    return {"skills": skills}
