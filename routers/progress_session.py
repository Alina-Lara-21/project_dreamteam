"""Creates / resumes learner workspaces identified by opaque progress_codes."""

from secrets import token_urlsafe

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app_db.database import get_db
from app_db.models import ProgressUser, UserProgressState
from app_db.schemas import ProgressResumeBody, ProgressStartBody, ProgressStartResponse

router = APIRouter(tags=["progress"])


def _create_unique_code(db: Session) -> str:
    for _ in range(10):
        candidate = token_urlsafe(14)
        if db.query(ProgressUser).filter(ProgressUser.progress_code == candidate).first() is None:
            return candidate
    raise RuntimeError("Could not mint progress_code")


@router.post("/progress/start", response_model=ProgressStartResponse)
def start_progress(body: ProgressStartBody, db: Session = Depends(get_db)):
    """Name + email generate a reusable bookmark."""
    code = _create_unique_code(db)
    learner = ProgressUser(
        display_name=body.display_name.strip(),
        email=body.email.strip(),
        progress_code=code,
    )
    db.add(learner)
    db.flush()
    db.add(UserProgressState(user_id=learner.id))
    db.commit()
    db.refresh(learner)

    return ProgressStartResponse(
        progress_code=learner.progress_code,
        display_name=learner.display_name,
        email=learner.email,
    )


@router.post("/progress/resume", response_model=ProgressStartResponse)
def resume_progress(body: ProgressResumeBody, db: Session = Depends(get_db)):
    """Lets another computer prove it saved the secret string."""
    code = body.progress_code.strip()
    learner = db.query(ProgressUser).filter(ProgressUser.progress_code == code).first()
    if learner is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Code not recognized")

    return ProgressStartResponse(
        progress_code=learner.progress_code,
        display_name=learner.display_name,
        email=learner.email,
    )
