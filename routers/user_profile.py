"""SQLite-backed profile payload for the profile page."""

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.deps import DependencyProgressUser
from app_db.models import UserProfile
from app_db.schemas import ProfileResponse, ProfileSave

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
    )


def _to_response(row: UserProfile) -> ProfileResponse:
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
    )


@router.get("/profile/data", response_model=ProfileResponse)
def get_profile_data(
    learner: DependencyProgressUser,
    db: Session = Depends(get_db),
):
    user_id = str(learner.id)
    row = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
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
    row = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if row is None:
        row = UserProfile(user_id=user_id)
        db.add(row)

    row.full_name = payload.full_name
    row.email = payload.email
    row.skills = payload.skills
    row.coursework = payload.coursework
    row.experience = payload.experience
    row.location = payload.location
    row.job_types = payload.job_types
    row.resume_text = payload.resume_text
    row.updated_at = datetime.utcnow().isoformat()

    db.commit()
    db.refresh(row)
    return _to_response(row)
